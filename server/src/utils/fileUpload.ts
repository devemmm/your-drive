import { Language } from "@prisma/client";
import sharp from "sharp";

type ImageValidationOptions = {
  minWidth?: number;
  minHeight?: number;
  minSizeKB?: number;
  resizeTo?: { width?: number; height?: number };
  jpegQuality?: number;
  language?: Language;
};

type OptimizedImageResult = {
  optimizedFiles: Express.Multer.File[];
  errors: string[];
};

const defaultOptions: Required<ImageValidationOptions> = {
  minWidth: 320,
  minHeight: 240,
  minSizeKB: 20,
  resizeTo: { width: 1280, height: 720 },
  jpegQuality: 80,
  language: Language.EN,
};

export async function validateAndOptimizeImages(
  files: Express.Multer.File[],
  options?: ImageValidationOptions
): Promise<OptimizedImageResult> {
  const config = {
    ...defaultOptions,
    ...options,
    resizeTo: {
      ...defaultOptions.resizeTo,
      ...options?.resizeTo,
    },
  };

  const isEN = config.language === "EN";

  const optimizedFiles: Express.Multer.File[] = [];
  const errors: string[] = [];

  for (const file of files) {
    let hasError = false;

    // Size check
    if (file.size < config.minSizeKB * 1024) {
      errors.push(
        isEN
          ? `Image "${file.originalname}" is too small. Minimum file size is ${config.minSizeKB}KB.`
          : `L'image "${file.originalname}" est trop petite. Taille minimale : ${config.minSizeKB}Ko.`
      );
      hasError = true;
    }

    // Metadata
    const metadata = await sharp(file.buffer).metadata();

    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width < config.minWidth ||
      metadata.height < config.minHeight
    ) {
      errors.push(
        isEN
          ? `Image "${file.originalname}" is too small. Minimum resolution is ${config.minWidth}x${config.minHeight}.`
          : `L'image "${file.originalname}" est trop petite. Résolution minimale : ${config.minWidth}x${config.minHeight}.`
      );
      hasError = true;
    }

    if (hasError) continue;

    // Resize logic
    const { width, height } = config.resizeTo;

    let resizedBuffer = file.buffer;
    if (metadata.width! > width! && metadata.height! > height!) {
      resizedBuffer = await sharp(file.buffer)
        .resize({
          width,
          height,
          fit: "cover",
          position: "attention",
        })
        .jpeg({ quality: config.jpegQuality })
        .toBuffer();
    } else if (metadata.width! > width! && metadata.height! < height!) {
      resizedBuffer = await sharp(file.buffer)
        .resize({
          width,
          fit: "cover",
          position: "attention",
        })
        .jpeg({ quality: config.jpegQuality })
        .toBuffer();
    } else if (metadata.width! < width! && metadata.height! > height!) {
      resizedBuffer = await sharp(file.buffer)
        .resize({
          height,
          fit: "cover",
          position: "attention",
        })
        .jpeg({ quality: 80 })
        .toBuffer();
    }

    optimizedFiles.push({ ...file, buffer: resizedBuffer });
  }

  return { optimizedFiles, errors };
}
