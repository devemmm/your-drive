import { Request, Response, NextFunction } from "express";

export const isTestEnv = (req: Request, res: Response, next: NextFunction): void => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ message: "Not found" });
    return;
  }

  const expected = process.env.TEST_AUTH_TOKEN;
  if (!expected) {
    res.status(404).json({ message: "Not found" });
    return;
  }

  const provided = req.header("x-test-token");
  if (provided !== expected) {
    res.status(403).json({ message: "Invalid test token" });
    return;
  }

  next();
};
