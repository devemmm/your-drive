import { body, param, query } from "express-validator";
import { SubscriptionType, SubscriptionDuration, PlanCategory } from "@prisma/client";
import { validationMsg } from "../../utils/validation";

export const createPlanValidator = [
  body("name")
    .isString()
    .withMessage(validationMsg("validation.plan_name_string"))
    .notEmpty()
    .withMessage(validationMsg("validation.plan_name_required")),
  body("description")
    .optional()
    .isString()
    .withMessage(validationMsg("validation.plan_description_string")),
  body("type")
    .notEmpty()
    .withMessage(validationMsg("validation.plan_type_required"))
    .isIn(Object.values(SubscriptionType))
    .withMessage(validationMsg("validation.plan_type_invalid", {
      plan_types: Object.values(SubscriptionType).join(", "),
    })),

  body("duration")
    .optional()
    .isIn(Object.values(SubscriptionDuration))
    .withMessage(validationMsg("validation.plan_duration_invalid", {
      plan_dulations: Object.values(SubscriptionDuration).join(", "),
    })),
  body("subscriptionEndDate")
    .optional()
    .isInt()
    .withMessage(validationMsg("validation.plan_subscriptionEndDate_number"))
    .toInt(),

  body().custom((value) => {
    if (!value.duration && !value.subscriptionEndDate) {
      return false;
    }
    return true;
  }).withMessage(validationMsg("validation.plan_either_duration_or_enddate")),

  body().custom((value) => {
    if (value.duration && value.subscriptionEndDate) {
      return false;
    }
    return true;
  }).withMessage(validationMsg("validation.plan_only_one_of_duration_enddate")),

  body("price")
    .notEmpty()
    .withMessage(validationMsg("validation.plan_price_required"))
    .isFloat({ min: 0 })
    .withMessage(validationMsg("validation.plan_price_positive")),
  body("availableUntil")
    .optional()
    .isInt()
    .withMessage(validationMsg("validation.plan_availableUntil_number"))
    .toInt(),
  body("category")
    .isIn(Object.values(PlanCategory))
    .withMessage(validationMsg("validation.plan_category_invalid", {
      categories: Object.values(PlanCategory).join(", "),
    })),
];

export const updatePlanValidator = [
  body("name").optional().isString().withMessage(validationMsg("validation.plan_name_string")),
  body("description").optional().isString().withMessage(validationMsg("validation.plan_description_string")),
  body("type")
    .optional()
    .isIn(Object.values(SubscriptionType))
    .withMessage(validationMsg("validation.plan_type_invalid", {
      plan_types: Object.values(SubscriptionType).join(", "),
    })),
  body("duration")
    .optional()
    .isIn(Object.values(SubscriptionDuration))
    .withMessage(validationMsg("validation.plan_duration_invalid", {
      plan_dulations: Object.values(SubscriptionDuration).join(", "),
    })),
  body("subscriptionEndDate")
    .optional()
    .isInt()
    .withMessage(validationMsg("validation.plan_subscriptionEndDate_number"))
    .toInt(),

  body().custom((value) => {
    if (value.duration && value.subscriptionEndDate) {
      return false;
    }
    return true;
  }).withMessage(validationMsg("validation.plan_only_one_of_duration_enddate")),

  body("price").optional().isFloat({ min: 0 }).withMessage(validationMsg("validation.plan_price_positive")).toFloat(),
  body("availableUntil")
    .optional({ nullable: true })
    .isInt()
    .withMessage(validationMsg("validation.plan_availableUntil_number"))
    .toInt(),
  body("category").optional().isIn(Object.values(PlanCategory)).withMessage(validationMsg("validation.plan_category_invalid", {
    categories: Object.values(PlanCategory).join(", "),
  })),
  body("isActive").optional().isBoolean().withMessage(validationMsg("validation.invalid_request")).toBoolean(),

  param("id")
    .isInt({ gt: 0 })
    .withMessage(validationMsg("validation.plan_id_positive"))
    .escape()
    .toInt(),
];

export const subscribeValidator = [
  body("planId")
    .notEmpty()
    .withMessage(validationMsg("validation.planId_positive"))
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.planId_positive"))
    .toInt(),
  body("useCoupons")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.useCoupons_boolean"))
    .toBoolean(),
  body("billingAddress")
    .exists()
    .withMessage(validationMsg("validation.billing_address_required"))
    .isObject()
    .withMessage(validationMsg("validation.billing_address_object")),

  body("billingAddress.street")
    .exists()
    .withMessage(validationMsg("validation.billing_street_required"))
    .isString()
    .withMessage(validationMsg("validation.billing_street_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.billing_street_required")),

  body("billingAddress.city")
    .exists()
    .withMessage(validationMsg("validation.billing_city_required"))
    .isString()
    .withMessage(validationMsg("validation.billing_city_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.billing_city_required")),

  body("billingAddress.province")
    .exists()
    .withMessage(validationMsg("validation.billing_province_required"))
    .isString()
    .withMessage(validationMsg("validation.billing_province_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.billing_province_required")),

  body("billingAddress.postalCode")
    .exists()
    .withMessage(validationMsg("validation.billing_postal_required"))
    .isString()
    .withMessage(validationMsg("validation.billing_postal_string"))
    .trim()
    .notEmpty()
    .withMessage(validationMsg("validation.billing_postal_required")),
];

export const getSubscribePlansValidator = [
  query("includeExpired")
  .optional()
  .isBoolean()
  .withMessage(validationMsg("validation.includeExpired_boolean"))
  .toBoolean(),
  query("type")
  .optional()
  .isIn(Object.values(SubscriptionType))
  .withMessage(validationMsg("validation.plan_type_invalid", {
    plan_types: Object.values(SubscriptionType).join(", "),
  })),
];

export const getSubscriptionsValidator = [
  query("userId")
    .optional()
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.userId_positive"))
    .toInt(),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.page_positive_int"))
    .toInt(),
  query("pageSize")
    .optional()
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.page_size_positive_int"))
    .toInt(),
];

export const getUserSubscriptionsValidator = [
  query("userId")
    .optional()
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.userId_positive"))
    .toInt(),
  query("planId")
    .optional()
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.planId_positive"))
    .toInt(),
  query("isActive")
    .optional()
    .isBoolean()
    .withMessage(validationMsg("validation.active_boolean"))
    .toBoolean(),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.page_positive_int"))
    .toInt(),
  query("pageSize")
    .optional()
    .isInt({ min: 1 })
    .withMessage(validationMsg("validation.page_size_positive_int"))
    .toInt(),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage(validationMsg("validation.startDate_iso8601")),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage(validationMsg("validation.endDate_iso8601")),
];


export const updateCommissionValidator = [
  body("rate")
    .isFloat({min: 0, max: 100})
    .withMessage(validationMsg("validation.commission_rate_invalid"))
    .toFloat(),
];