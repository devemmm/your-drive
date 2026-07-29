import { checkSchema, ParamSchema, Schema, body } from "express-validator";
import { VehicleCategory, Transmission, FuelType, VehicleStatus, VehicleTier } from "@prisma/client";
import { validationMsg } from "../../utils/validation";

const vehicleCategoryBodyField: ParamSchema = {
  in: ["body"],
  optional: true,
  isString: true,
  isIn: {
    options: [Object.values(VehicleCategory)],
    errorMessage: validationMsg("validation.vehicle_category_invalid"),
  },
};

const transmissionField: ParamSchema = {
  in: ["body"],
  optional: { options: { nullable: true } },
  isIn: { options: [Object.values(Transmission)] },
};

const fuelTypeField: ParamSchema = {
  in: ["body"],
  optional: { options: { nullable: true } },
  isIn: { options: [Object.values(FuelType)] },
};

const vehicleStatusField: ParamSchema = {
  in: ["body"],
  optional: true,
  isIn: { options: [Object.values(VehicleStatus)] },
};

const vehicleTierField: ParamSchema = {
  in: ["body"],
  optional: { options: { nullable: true } },
  isIn: { options: [Object.values(VehicleTier)] },
};

const motorbikeCapacityRule = body("capacity").custom((value, { req }) => {
  const category = (req as { body: { category?: string } }).body.category;
  if (category === "MOTORBIKE" && Number(value) > 1) {
    throw new Error("Motorbikes must have a capacity of 1");
  }
  return true;
});

export const VehicleSchema: Schema = {
  make: {
    in: ["body"],
    exists: { errorMessage: validationMsg("validation.vehicle_make_required") },
    isString: true,
    trim: true,
    isLength: {
      options: { min: 2, max: 30 },
      errorMessage: validationMsg("validation.vehicle_make_length"),
    },
  },
  model: {
    in: ["body"],
    exists: { errorMessage: validationMsg("validation.model_required") },
    isString: true,
    trim: true,
    isLength: {
      options: { min: 1, max: 30 },
      errorMessage: validationMsg("validation.model_length"),
    },
  },
  year: {
    in: ["body"],
    optional: true,
    isInt: {
      options: { min: 1990, max: new Date().getFullYear() },
      errorMessage: validationMsg("validation.year_range", { year: String(new Date().getFullYear()) }),
    },
    toInt: true,
  },
  capacity: {
    in: ["body"],
    exists: { errorMessage: validationMsg("validation.vehicle_capacity_required") },
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.vehicle_capacity_min"),
    },
    toInt: true,
  },
  category: vehicleCategoryBodyField,
  color: {
    in: ["body"],
    exists: { errorMessage: validationMsg("validation.color_required") },
    isString: true,
    trim: true,
    isLength: {
      options: { max: 20 },
      errorMessage: validationMsg("validation.color_too_long"),
    },
  },
  plateNumber: {
    in: ["body"],
    exists: { errorMessage: validationMsg("validation.plate_required") },
    isString: true,
    trim: true,
    isLength: {
      options: { min: 3, max: 15 },
      errorMessage: validationMsg("validation.plate_length"),
    },
  },
  transmission: transmissionField,
  fuelType: fuelTypeField,
  status: vehicleStatusField,
  tier: vehicleTierField,
};

// export const VehicleUpdateSchema: Schema = {
//   make: {
//     in: ["body"],
//     optional: true,
//     isString: true,
//     trim: true,
//     isLength: {
//       options: { min: 2 },
//       errorMessage: validationMsg("validation.vehicle_make_length"),
//     },
//   },
//   model: {
//     in: ["body"],
//     optional: true,
//     isString: true,
//     trim: true,
//     isLength: {
//       options: { min: 1 },
//       errorMessage: validationMsg("validation.model_length"),
//     },
//   },
//   year: {
//     in: ["body"],
//     optional: true,
//     toInt: true,
//     isInt: {
//       options: { min: 1990, max: new Date().getFullYear() + 1 },
//       errorMessage: validationMsg("validation.year_range", { year: String(new Date().getFullYear() + 1) }),
//     },
//   },
//   color: {
//     in: ["body"],
//     optional: true,
//     isString: true,
//     trim: true,
//     isLength: {
//       options: { max: 20 },
//       errorMessage: validationMsg("validation.color_too_long"),
//     },
//   },
//   plateNumber: {
//     in: ["body"],
//     optional: true,
//     isString: true,
//     trim: true,
//     isLength: {
//       options: { min: 3, max: 15 },
//       errorMessage: validationMsg("validation.plate_length"),
//     },
//   },
//   capacity: {
//     in: ["body"],
//     optional: true,
//     isInt: {
//       options: { min: 1 },
//       errorMessage: validationMsg("validation.vehicle_capacity_min"),
//     },
//     toInt: true,
//   },
// };

export const validateVehicle = [checkSchema(VehicleSchema), motorbikeCapacityRule];
// export const validateVehicleUpdate = checkSchema(VehicleUpdateSchema);

export type VehicleInput = {
  make: string;
  model: string;
  year?: number;
  color: string;
  plateNumber: string;
  capacity: number;
  category?: VehicleCategory;
  transmission?: Transmission | null;
  fuelType?: FuelType | null;
  status?: VehicleStatus;
  tier?: VehicleTier | null;
};

const defaultVehicleImageSchema: Schema = {
  vehicleId: {
    in: ["params"],
    exists: { errorMessage: validationMsg("validation.vehicleId_required") },
    isInt: { options: { gt: 0 }, errorMessage: validationMsg("validation.vehicleId_positive") },
    toInt: true,
  },
  imageId: {
    in: ["body"],
    exists: { errorMessage: validationMsg("validation.imageId_required") },
    isInt: { options: { gt: 0 }, errorMessage: validationMsg("validation.imageId_positive") },
    toInt: true,
  },
};

const updateVehicleImageSchema: Schema = {
  vehicleId: {
    in: ["params"],
    exists: { errorMessage: validationMsg("validation.vehicleId_required") },
    isInt: { options: { gt: 0 }, errorMessage: validationMsg("validation.vehicleId_positive") },
    toInt: true,
  },
  imageId: {
    in: ["params"],
    exists: { errorMessage: validationMsg("validation.imageId_required") },
    isInt: { options: { gt: 0 }, errorMessage: validationMsg("validation.imageId_positive") },
    toInt: true,
  },
};

export const validateSetDefaultVehicleImage = checkSchema(defaultVehicleImageSchema);
export const validateUpdateVehicleImage = checkSchema(updateVehicleImageSchema);

export const UpdateVehicleSchema: Schema = {
  make: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: validationMsg("validation.make_string") },
    trim: true,
    isLength: {
      options: { min: 2, max: 30 },
      errorMessage: validationMsg("validation.make_length"),
    },
  },
  model: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: validationMsg("validation.model_string") },
    trim: true,
    isLength: {
      options: { min: 1, max: 30 },
      errorMessage: validationMsg("validation.model_length"),
    },
  },
  year: {
    in: ["body"],
    optional: true,
    isInt: {
      options: { min: 1990, max: new Date().getFullYear() + 1 },
      errorMessage: validationMsg("validation.year_range", {
        year: new Date().getFullYear() + 1,
      }),
    },
    toInt: true,
  },
  color: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: validationMsg("validation.color_string") },
    trim: true,
    isLength: {
      options: { max: 20 },
      errorMessage: validationMsg("validation.color_length"),
    },
  },
  plateNumber: {
    in: ["body"],
    optional: true,
    isString: { errorMessage: validationMsg("validation.plate_string") },
    trim: true,
    isLength: {
      options: { min: 3, max: 15 },
      errorMessage: validationMsg("validation.plate_length"),
    },
  },
  capacity: {
    in: ["body"],
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: validationMsg("validation.vehicle_capacity_min"),
    },
    toInt: true,
  },
  category: vehicleCategoryBodyField,
  transmission: transmissionField,
  fuelType: fuelTypeField,
  status: vehicleStatusField,
  tier: vehicleTierField,
};

export type ChageDefaultVehicleImage = {
  vehicleId: number,
  imageId: number,
}

export const validateUpdateVehicle = [checkSchema(UpdateVehicleSchema), motorbikeCapacityRule];