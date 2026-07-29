import { Language } from "@prisma/client";
import multer from "multer";
import { AppError } from "../utils/AppError";

const memoryStorage = multer.memoryStorage();

export const uploadImage = multer({
  storage: memoryStorage,
  // limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: async (req, file, cb) => {
    const { lang = "EN" } = req.query;
    const language = (lang as string).toUpperCase().trim() as Language;
    const isSupportedLang = Object.values(Language).includes(language);
    const prefLang = isSupportedLang ? language : Language.EN;
    let isEnglishPreferred = prefLang === Language.EN;

    if (!file.mimetype.startsWith("image/")) {
      return cb(
        AppError(
          isEnglishPreferred
            ? "Only image files are allowed"
            : "Seuls les fichiers image sont permis",
          422
        )
      );
    }
    cb(null, true);
  },
});

export const uploadDocument = multer({
  storage: memoryStorage,
  // limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const { lang = "EN" } = req.query;
    const language = (lang as string).toUpperCase().trim() as Language;
    const isSupportedLang = Object.values(Language).includes(language);
    const prefLang = isSupportedLang ? language : Language.EN;
    let isEnglishPreferred = prefLang === Language.EN;
    const accepted = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!accepted.includes(file.mimetype)) {
      return cb(
        AppError(
          isEnglishPreferred
            ? "Only PDF, Word, or Excel documents are allowed"
            : "Seuls les documents PDF, Word ou Excel sont autorisés",
          422
        )
      );
    }

    // This does not work here, can be done in the controller
    // if (file.size < 20 * 1024) {
    //   return cb(
    //     AppError(
    //       isEnglishPreferred
    //         ? "Document file too small (min 20KB)"
    //         : "Fichier de document trop petit (min 20 Ko)",
    //       422
    //     )
    //   );
    // }

    cb(null, true);
  },
});

export const upload = multer({
  storage: memoryStorage,
  // limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: async (req, file, cb) => {
    const { lang = "EN" } = req.query;
    const language = (lang as string).toUpperCase().trim() as Language;
    const isSupportedLang = Object.values(Language).includes(language);
    const prefLang = isSupportedLang ? language : Language.EN;
    let isEnglishPreferred = prefLang === Language.EN;
    const accepted = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (
      !file.mimetype.startsWith("image/") ||
      !accepted.includes(file.mimetype)
    ) {
      return cb(
        AppError(
          isEnglishPreferred
            ? "Only image and document files are allowed"
            : "Seuls les fichiers image et document sont autorisés",
          422
        )
      );
    }

    // These checks will be done in the controller, the do not work here
    // if (file.mimetype.startsWith("image/")) {
    //   if (file.size < 50 * 1024) {
    //     return cb(
    //       AppError(
    //         isEnglishPreferred
    //           ? "Image file too small (min 50KB)"
    //           : "Fichier image trop petit (min 50 Ko)",
    //         422
    //       )
    //     );
    //   }

    //   // This
    //   // try {
    //   //   const metadata = await sharp(file.buffer).metadata();

    //   //   if (metadata.width! < 640 || metadata.height! < 480) {
    //   //     return cb(
    //   //       AppError(
    //   //         isEnglishPreferred
    //   //           ? "Image resolution too low (min 640x480)"
    //   //           : "Résolution d'image trop faible (min 640x480)",
    //   //         422
    //   //       )
    //   //     );
    //   //   }

    //   //   cb(null, true);
    //   // } catch (err) {
    //   //   cb(
    //   //     AppError(
    //   //       isEnglishPreferred ? "Invalid image file" : "Fichier image invalide"
    //   //     )
    //   //   );
    //   // }
    // }

    // if (file.size < 20 * 1024) {
    //   return cb(
    //     AppError(
    //       isEnglishPreferred
    //         ? "Document file too small (min 20KB)"
    //         : "Fichier de document trop petit (min 20 Ko)",
    //       422
    //     )
    //   );
    // }

    cb(null, true);
  },
});
