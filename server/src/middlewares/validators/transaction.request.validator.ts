import { checkSchema, Schema } from "express-validator";
import { TransactionStatus, TransactionType, PaymentProvider } from "@prisma/client";
import { validationMsg } from "../../utils/validation";

const getAllTransactionsSchema: Schema = {
  page: {
    in: ["query"],
    optional: true,
    isInt: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.page_positive_int"),
    },
    toInt: true,
  },
  pageSize: {
    in: ["query"],
    optional: true,
    isInt: {
      options: { gt: 0 },
      errorMessage: validationMsg("validation.page_size_positive_int"),
    },
    toInt: true,
  },
  status: {
    in: ["query"],
    optional: true,
    isIn: {
      options: [Object.values(TransactionStatus)],
      errorMessage: validationMsg("validation.status_invalid", {
        statuses: Object.values(TransactionStatus).join(", "),
      }),
    },
  },
  type: {
    in: ["query"],
    optional: true,
    isIn: {
      options: [Object.values(TransactionType)],
      errorMessage: validationMsg("validation.type_invalid", {
        types: Object.values(TransactionType).join(", "),
      }),
    },
  },
  paymentProvider: {
    in: ["query"],
    optional: true,
    toUpperCase: true,
    trim: true,
    isIn: {
      options: [Object.values(PaymentProvider)],
      errorMessage: validationMsg("validation.paymentProvider_invalid", {
        providers: Object.values(PaymentProvider).join(", "),
      }),
    },
  },
  minAmount: {
    in: ["query"],
    optional: true,
    isFloat: {
      options: { min: 0 },
      errorMessage: validationMsg("validation.minAmount_non_negative"),
    },
    toFloat: true,
  },
  maxAmount: {
    in: ["query"],
    optional: true,
    isFloat: {
      options: { min: 0 },
      errorMessage: validationMsg("validation.maxAmount_non_negative"),
    },
    toFloat: true,
  },
};

export const validateGetAllTransactions = checkSchema(getAllTransactionsSchema);

const confirmPaymentForSessionSchema: Schema = {
  sessionId: {
    in: ["body"],
    exists: {
      errorMessage: validationMsg("validation.session_id_required"),
    },
    isString: {
      errorMessage: validationMsg("validation.session_id_string"),
    },
    trim: true,
    notEmpty: {
      errorMessage: validationMsg("validation.session_id_required"),
    },
  },
  paymentMethodId: {
    in: ["body"],
    exists: {
      errorMessage: validationMsg("validation.payment_method_id_required"),
    },
    isString: {
      errorMessage: validationMsg("validation.payment_method_id_string"),
    },
    trim: true,
    notEmpty: {
      errorMessage: validationMsg("validation.payment_method_id_required"),
    },
  },
  saveCard: {
    in: ["body"],
    optional: true,
    isBoolean: {
      errorMessage: validationMsg("validation.save_card"),
    },
    toBoolean: true,
  },
};

export const validateConfirmPaymentForSession = checkSchema(
  confirmPaymentForSessionSchema
);

const finalizeAfter3DSSchema: Schema = {
  paymentIntentId: {
    in: ["body"],
    exists: {
      errorMessage: validationMsg("validation.paymentIntentId_required"),
    },
    isString: {
      errorMessage: validationMsg("validation.paymentIntentId_invalid"),
    },
    trim: true,
    notEmpty: {
      errorMessage: validationMsg("validation.paymentIntentId_required"),
    },
  },
  sessionId: {
    in: ["body"],
    exists: {
      errorMessage: validationMsg("validation.sessionId_required"),
    },
    isString: {
      errorMessage: validationMsg("validation.sessionId_invalid"),
    },
    trim: true,
    notEmpty: {
      errorMessage: validationMsg("validation.sessionId_required"),
    },
  },
};

export const validateFinalizeAfter3DS = checkSchema(finalizeAfter3DSSchema);
