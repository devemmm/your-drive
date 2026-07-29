import { User, UserRole } from "@prisma/client";
import jwt from "jsonwebtoken";

export const generateToken = (user: Pick<User, "id" | "email">) => {
  const SECRET_KEY = process.env.SECRET_KEY;
  if (!SECRET_KEY) return "No SECRET_KEY provided";
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
    expiresIn: "1d",
  });
  return token;
};
