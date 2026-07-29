import jwt from "jsonwebtoken";
import { Request } from "express";

export const verifyToken = (req: Request) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("No token provided");
    }

    const token = authHeader.split(" ")[1];
    const SECRET_KEY = process.env.SECRET_KEY;

    if (!SECRET_KEY) throw new Error("No SECRET_KEY provided");

    const decoded = jwt.verify(token, SECRET_KEY) as {
      id: number;
      email: string;
    };
    return decoded;
  } catch (error) {
    throw new Error("Invalid token");
  }
};
