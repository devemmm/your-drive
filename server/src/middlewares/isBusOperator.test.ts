import { UserRole } from "@prisma/client";
import { isBusOperator } from "./isBusOperator";

function mockReq(role: UserRole) {
  return { user: { role }, isEnglishPreferred: true } as any;
}

describe("isBusOperator", () => {
  it("calls next() with no error for BUS_OPERATOR", () => {
    const next = jest.fn();
    isBusOperator(mockReq(UserRole.BUS_OPERATOR), {} as any, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("rejects non-operators with a 403", () => {
    const next = jest.fn();
    isBusOperator(mockReq(UserRole.USER), {} as any, next);
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
  });
});
