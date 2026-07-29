import { body } from "express-validator";
import { validationMsg } from "../../utils/validation";

export const sendMessageValidator = [
  body()
    .custom((value, { req }) => {
      const allowedFields = ["content"];
      const receivedFields = Object.keys(req.body);
      const hasInvalidFields = receivedFields.some(
        (el) => !allowedFields.includes(el)
      );
      if (hasInvalidFields) throw new Error();
      return true;
    })
    .withMessage(validationMsg("validation.only_content_allowed")),
  body("content")
    .isString()
    .withMessage(validationMsg("validation.content_string")),
];

export const updateMessageValidator = [
  body()
    .custom((value, { req }) => {
      const allowedFields = ["content"];
      const receivedFields = Object.keys(req.body);
      const hasInvalidFields = receivedFields.some(
        (el) => !allowedFields.includes(el)
      );
      if (hasInvalidFields) throw new Error();
      return true;
    })
    .withMessage(validationMsg("validation.only_content_allowed")),
  body("content")
    .isString()
    .withMessage(validationMsg("validation.content_string")),
];
