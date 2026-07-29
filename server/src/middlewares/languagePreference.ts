import { Language } from "@prisma/client";
import { NextFunction, Request, Response } from "express";

export const languagePreference = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { lang = "EN" } = req.query;
  const setLanguage = (lang as string).toUpperCase().trim() as Language;
        const preferredLang = Object.values(Language).includes(setLanguage)
          ? setLanguage
          : req.user?.language ?? Language.EN;
  
        const isEnglishPreferred = preferredLang === Language.EN;

  (req as any).isEnglishPreferred = isEnglishPreferred;

  next();
};
