import { body } from "express-validator";
import { validationMsg } from "../../utils/validation";

export const moderateContentValidator = [
  body()
    .custom((value, { req }) => {
      const allowedFields = ["content", "context"];
      const receivedFields = Object.keys(req.body);
      const hasInvalidFields = receivedFields.some(
        (el) => !allowedFields.includes(el)
      );
      if (hasInvalidFields) throw new Error();
      return true;
    })
    .withMessage(validationMsg("validation.only_content_context_allowed")),

  body("content")
    .isString()
    .notEmpty()
    .withMessage(validationMsg("validation.content_required")),

  body("context").isObject().withMessage(validationMsg("validation.context_object")),

  body("context.contentType")
    .isIn(["chat_message", "review", "ride_notes", "location_name"])
    .withMessage(validationMsg("validation.content_type_invalid")),

  body("context.userRole")
    .optional()
    .isIn(["USER", "ADMIN"])
    .withMessage(validationMsg("validation.user_role_invalid")),

  body("context.questionContext")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.question_context_string")),

  body("context.previousMessages")
    .optional()
    .isArray()
    .withMessage(validationMsg("validation.previous_messages_array")),
];

export const moderateMultipleValidator = [
  body()
    .custom((value, { req }) => {
      const allowedFields = ["contents"];
      const receivedFields = Object.keys(req.body);
      const hasInvalidFields = receivedFields.some(
        (el) => !allowedFields.includes(el)
      );
      if (hasInvalidFields) throw new Error();
      return true;
    })
    .withMessage(validationMsg("validation.only_contents_allowed")),

  body("contents")
    .isArray({ min: 1, max: 10 })
    .withMessage(validationMsg("validation.contents_array_range")),

  body("contents.*.content")
    .isString()
    .notEmpty()
    .withMessage(validationMsg("validation.each_content_required")),

  body("contents.*.context")
    .isObject()
    .withMessage(validationMsg("validation.each_context_object")),

  body("contents.*.context.contentType")
    .isIn(["chat_message", "review", "ride_notes", "location_name"])
    .withMessage(validationMsg("validation.each_content_type_invalid")),

  body("contents.*.context.userRole")
    .optional()
    .isIn(["USER", "ADMIN"])
    .withMessage(validationMsg("validation.each_user_role_invalid")),

  body("contents.*.context.questionContext")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.each_question_context_string")),

  body("contents.*.context.previousMessages")
    .optional()
    .isArray()
    .withMessage(validationMsg("validation.each_previous_messages_array")),
];
