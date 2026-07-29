import { validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { validateVehicle, validateUpdateVehicle } from "../vehicle.request.validator";

async function runValidators(validators: any[], body: Record<string, unknown>) {
  const req = {
    body,
    query: {},
    params: {},
    t: (key: string) => key,
  } as unknown as Request;
  for (const v of validators) {
    await (v as any).run(req);
  }
  return validationResult(req)
    .array()
    .map((e) => e.msg as string);
}

const baseCreate = {
  make: "Yamaha",
  model: "MT07",
  color: "Black",
  plateNumber: "RAB123A",
};

describe("vehicle validator — MOTORBIKE capacity rule", () => {
  it("rejects create with MOTORBIKE + capacity > 1", async () => {
    const errors = await runValidators(validateVehicle as any, {
      ...baseCreate,
      capacity: 2,
      category: "MOTORBIKE",
    });
    expect(errors.join(" ")).toMatch(/motorbike.*capacity.*1/i);
  });

  it("accepts create with MOTORBIKE + capacity = 1", async () => {
    const errors = await runValidators(validateVehicle as any, {
      ...baseCreate,
      capacity: 1,
      category: "MOTORBIKE",
    });
    expect(errors.find((m) => /motorbike/i.test(m))).toBeUndefined();
  });

  it("accepts create with CAR + capacity = 4", async () => {
    const errors = await runValidators(validateVehicle as any, {
      ...baseCreate,
      capacity: 4,
      category: "CAR",
    });
    expect(errors.find((m) => /motorbike/i.test(m))).toBeUndefined();
  });

  it("rejects update changing to MOTORBIKE while capacity > 1", async () => {
    const errors = await runValidators(validateUpdateVehicle as any, {
      category: "MOTORBIKE",
      capacity: 4,
    });
    expect(errors.join(" ")).toMatch(/motorbike.*capacity.*1/i);
  });
});
