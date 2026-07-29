import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { logger } from "./logger";

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
const PUBLIC_URL =
  process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${BUCKET}`;

export const uploadToStorage = async (
  file: string,
  isSvg: boolean = false
): Promise<UploadResult> => {
  try {
    const folder = "Your-Drive/profiles";

    if (isSvg) {
      const buffer = Buffer.from(file, "utf-8");
      const key = `${folder}/avatar_${uuidv4()}.svg`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buffer,
          ContentType: "image/svg+xml",
        })
      );

      return {
        secure_url: `${PUBLIC_URL}/${key}`,
        public_id: key,
      };
    }

    // file is a URL (e.g. Google profile picture) - download and re-upload
    const response = await axios.get(file, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);
    const contentType = response.headers["content-type"] || "image/jpeg";
    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
    const key = `${folder}/${uuidv4()}.${ext}`;

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
  } catch (error) {
    logger.error("Error uploading to storage:", error);
    throw new Error("Failed to upload image");
  }
};
