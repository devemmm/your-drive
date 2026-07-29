import { validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { registerRequestBodyValidator } from "../auth.request.validator";

async function runValidator(body: Record<string, unknown>) {
  const req = {
    body,
    query: {},
    params: {},
    // validationMsg helper calls req.t(key, data); stub it to return the key
    // so error messages remain searchable (e.g. "validation.password_rule").
    t: (key: string) => key,
  } as unknown as Request;
  const _res = {} as Response;
  const _next: NextFunction = () => undefined;
  for (const v of registerRequestBodyValidator) {
    // express-validator middleware exposes a `run` method
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (v as any).run(req);
  }
  return validationResult(req)
    .array()
    .map((e) => e.msg as string);
}

const validBody = {
  firstName: "Test",
  lastName: "User",
  email: "t@example.com",
  agreeToTerms: true,
};

describe("password rule", () => {
  it("rejects passwords shorter than 8 chars", async () => {
    const errors = await runValidator({ ...validBody, password: "Pa1" });
    expect(errors.join(" ")).toMatch(/password/i);
  });
  it("rejects passwords without an uppercase letter", async () => {
    const errors = await runValidator({ ...validBody, password: "password1" });
    expect(errors.join(" ")).toMatch(/password/i);
  });
  it("rejects passwords without a lowercase letter", async () => {
    const errors = await runValidator({ ...validBody, password: "PASSWORD1" });
    expect(errors.join(" ")).toMatch(/password/i);
  });
  it("rejects passwords without a digit", async () => {
    const errors = await runValidator({ ...validBody, password: "Password" });
    expect(errors.join(" ")).toMatch(/password/i);
  });
  it("accepts passwords meeting all rules", async () => {
    const errors = await runValidator({ ...validBody, password: "Password1" });
    expect(errors.find((m) => /password/i.test(m))).toBeUndefined();
  });
});
