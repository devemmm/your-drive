import { Request } from "express";

export const validationMsg = (
  key: string,
  data?: Record<string, any>
): ((value: any, meta: { req: Request }) => any) => {
  return (_value, { req }) => {
    const r = req;
    return r.t(key, data);
  };
};
