import { FeeType } from '@prisma/client';
import { body, checkSchema, param, Schema } from 'express-validator';
import { validationMsg } from '../../utils/validation';

const FeeSettingCreateSchema: Schema = {
  type: {
    in: ['body'],
    exists: {
      errorMessage: validationMsg("validation.fee_type_required"),
    },
    isString: {
      errorMessage: validationMsg("validation.fee_type_string"),
    },
    trim: true,
    isIn: {
      options: [Object.values(FeeType)],
      errorMessage: validationMsg("validation.fee_type_invalid", {
        types: Object.values(FeeType).join(", "),
      }),
    },
  },
  amount: {
    in: ['body'],
    exists: {
      errorMessage: validationMsg("validation.amount_required"),
    },
    isFloat: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.amount_positive"),
    },
    toFloat: true,
  },
  active: {
    in: ['body'],
    optional: true,
    isBoolean: {
      errorMessage: validationMsg("validation.active_boolean"),
    },
    toBoolean: true,
  },
};

const FeeSettingUpdateSchema: Schema = {
  amount: {
    in: ['body'],
    optional: true,
    isFloat: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.amount_positive"),
    },
    toFloat: true,
  },
  active: {
    in: ['body'],
    optional: true,
    isBoolean: {
      errorMessage: validationMsg("validation.active_boolean"),
    },
    toBoolean: true,
  },
  feeSettingId: {
    in: ['params'],
    exists: {
      errorMessage: validationMsg("validation.feeSettingId_required"),
    },
    isInt: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.feeSettingId_positive"),
    },
    toInt: true,
  }
};

export const validateCreateFeeSetting = checkSchema(FeeSettingCreateSchema);
export const validateUpdateFeeSetting = checkSchema(FeeSettingUpdateSchema);

export type FeeSettingInput = {
  type: FeeType;
  amount: number;
  active?: boolean;
};


const UpdateCouponRedeemRuleSchema: Schema = {
  ruleId: {
    in: ["params"],
    exists: {
      errorMessage: validationMsg("validation.ruleId_required"),
    },
    isInt: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.ruleId_positive"),
    },
    toInt: true,
  },
  requiredCoupons: {
    in: ['body'],
    optional: true,
    isInt: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.requiredCoupons_positive"),
    },
    toInt: true,
  },
  description: {
    in: ['body'],
    optional: true,
    isString: {
      errorMessage: validationMsg("validation.description_string"),
    },
    trim: true,
  },
};

export const validateUpdateCouponRedeemRuleSetting = checkSchema(UpdateCouponRedeemRuleSchema);

const GetLogsSchema: Schema = {
  page: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.page_positive_int"),
    },
    toInt: true,
  },
  limit: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.limit_positive"),
    },
    toInt: true,
  },
  level: {
    in: ['query'],
    optional: true,
    isString: {
      errorMessage: validationMsg("validation.level_string"),
    },
    trim: true,
  },
  action: {
    in: ['query'],
    optional: true,
    isString: {
      errorMessage: validationMsg("validation.action_string"),
    },
    trim: true,
  },
  userId: {
    in: ['query'],
    optional: true,
    isInt: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.userId_positive"),
    },
    toInt: true,
  },
  search: {
    in: ['query'],
    optional: true,
    isString: {
      errorMessage: validationMsg("validation.invalid_request"),
    },
    trim: true,
  },
  sortBy: {
    in: ['query'],
    optional: true,
    isString: {
      errorMessage: validationMsg("validation.sortBy_string"),
    },
    trim: true,
  },
  sortOrder: {
    in: ['query'],
    optional: true,
    isIn: {
      options: [['asc', 'desc']],
      errorMessage: validationMsg("validation.sortOrder_invalid"),
    },
    trim: true,
  },
  startDate: {
    in: ['query'],
    optional: true,
    isISO8601: {
      errorMessage: validationMsg("validation.startDate_iso"),
    },
  },
  endDate: {
    in: ['query'],
    optional: true,
    isISO8601: {
      errorMessage: validationMsg("validation.endDate_iso"),
    },
  },
  exportType: {
    in: ['query'],
    optional: true,
    isString: {
      errorMessage: validationMsg("validation.exportType_string"),
    },
    trim: true,
  },
  type: {
    in: ['query'],
    optional: true,
    isString: {
      errorMessage: validationMsg("validation.logs_type_string"),
    },
    trim: true,
  },
};

export const validateGetLogs = checkSchema(GetLogsSchema);

export const validateSuspendUser = [
  param("userId")
    .exists().withMessage(validationMsg("validation.suspend_userId_required"))
    .isInt({ gt: 0 }).withMessage(validationMsg("validation.suspend_userId_positive"))
    .toInt(),
  body("suspendUntil")
    .optional()
    .isInt({ gt: 0 }).withMessage(validationMsg("validation.suspendUntil_positive"))
    .toInt(),
  body("suspensionReason")
    .optional()
    .isString().withMessage(validationMsg("validation.suspensionReason_string"))
    .trim()
    .notEmpty().withMessage(validationMsg("validation.suspensionReason_not_empty"))
    .isLength({ max: 200 }).withMessage(validationMsg("validation.suspensionReason_max"))
];
