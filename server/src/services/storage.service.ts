import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger";

export interface UploadResult {
  secure_url: string;
  public_id: string;
}

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
});

const BUCKET = process.env.S3_BUCKET || "your-drive";
const PUBLIC_URL = process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${BUCKET}`;

class StorageService {
  private MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

  async uploadBuffer(
    file: Express.Multer.File,
    folder?: string
  ): Promise<UploadResult | undefined> {
    let buffer = file.buffer;
    let contentType = file.mimetype;

    // Compress images if larger than 10MB
    if (file.mimetype.startsWith("image/") && file.size > this.MAX_UPLOAD_SIZE) {
      buffer = await sharp(file.buffer)
        .resize({ width: 1920, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
      contentType = "image/jpeg";
    }

    const ext = file.originalname.split(".").pop() || "bin";
    const key = folder
      ? `${folder}/${uuidv4()}.${ext}`
      : `${uuidv4()}.${ext}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    return {
      secure_url: `${PUBLIC_URL}/${key}`,
      public_id: key,
    };
  }

  async uploadMultipleBuffers(
    files: Express.Multer.File[],
    folder?: string
  ): Promise<(UploadResult | undefined)[]> {
    return Promise.all(files.map((file) => this.uploadBuffer(file, folder)));
  }

  async uploadBuffersByFields(
    files: { [fieldname: string]: Express.Multer.File[] },
    folder?: string
  ): Promise<{ [fieldname: string]: UploadResult[] }> {
    const results: { [fieldname: string]: UploadResult[] } = {};
    for (const fieldname in files) {
      results[fieldname] = (
        await this.uploadMultipleBuffers(files[fieldname], folder)
      ).filter((r): r is UploadResult => r !== undefined);
    }
    return results;
  }

  async deleteObject(key: string) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: key,
        })
      );
    } catch (error) {
      logger.warn(`Failed to delete S3 object ${key}:`, error);
    }
  }
}

export default new StorageService();
