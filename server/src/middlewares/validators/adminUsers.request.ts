import { body } from "express-validator";

export const createAdminUserValidator = [
  body("email").isEmail().normalizeEmail(),
  body("phoneNumber").optional().isString().trim().isLength({ min: 6, max: 20 }),
  body("firstName").isString().trim().isLength({ min: 1, max: 60 }),
  body("lastName").optional().isString().trim().isLength({ max: 60 }),
  body("password").optional().isString().isLength({ min: 8, max: 200 }),
  body("role").optional().isIn(["USER", "ADMIN", "BUS_OPERATOR"]),
];
