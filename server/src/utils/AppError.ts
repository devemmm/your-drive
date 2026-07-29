import { CustomError } from "../types/customError";

export const AppError = (msg: string, status = 400) => {
  const err: CustomError = new Error(msg);
  err.status = status;
  err.statusCode = status;
  return err;
};
