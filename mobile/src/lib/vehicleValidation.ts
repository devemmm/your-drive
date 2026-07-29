export interface VehicleFormData {
  make: string;
  model: string;
  year: string;
  color: string;
  plateNumber: string;
  capacity: string;
  category: string;
}

export function validateVehicleForm(form: VehicleFormData): string | null {
  if (!form.make.trim()) return "Make is required";
  if (!form.model.trim()) return "Model is required";
  const yearNum = parseInt(form.year);
  if (!form.year || isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) return "Valid year is required";
  if (!form.color.trim()) return "Color is required";
  if (!form.plateNumber.trim()) return "License plate is required";
  const capNum = parseInt(form.capacity);
  if (!form.capacity || isNaN(capNum) || capNum < 1 || capNum > 100) return "Valid capacity is required";
  if (!form.category) return "Category is required";
  if (form.category === "MOTORBIKE" && capNum !== 1) return "Motorbike capacity must be 1";
  return null;
}

export type VehicleFieldErrors = Partial<Record<keyof VehicleFormData, string>>;

export function validateVehicleFields(form: VehicleFormData): VehicleFieldErrors {
  const errors: VehicleFieldErrors = {};
  if (!form.make.trim()) errors.make = "Make is required";
  if (!form.model.trim()) errors.model = "Model is required";
  const yearNum = parseInt(form.year);
  if (!form.year || isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 1) {
    errors.year = "Valid year is required";
  }
  if (!form.color.trim()) errors.color = "Color is required";
  if (!form.plateNumber.trim()) errors.plateNumber = "License plate is required";
  const capNum = parseInt(form.capacity);
  if (!form.capacity || isNaN(capNum) || capNum < 1 || capNum > 100) {
    errors.capacity = "Valid capacity is required";
  } else if (form.category === "MOTORBIKE" && capNum !== 1) {
    errors.capacity = "Motorbike capacity must be 1";
  }
  if (!form.category) errors.category = "Category is required";
  return errors;
}
