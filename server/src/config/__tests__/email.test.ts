import { jest } from "@jest/globals";

const sendMock = jest.fn();

jest.mock("@aws-sdk/client-sesv2", () => ({
  SESv2Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  SendEmailCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const warnMock = jest.fn();
jest.mock("../../utils/logger", () => ({
  logger: { warn: warnMock, info: jest.fn(), error: jest.fn() },
}));

describe("email config — SES adapter", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    sendMock.mockReset();
    warnMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("logs a warning at load time when env vars are missing", async () => {
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.SES_FROM_ADDRESS;

    await import("../email");

    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining("SES not configured")
    );
  });

  test("sendPasswordResetEmail returns false when not configured", async () => {
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.SES_FROM_ADDRESS;

    const { sendPasswordResetEmail } = await import("../email");
    const result = await sendPasswordResetEmail("a@b.com", "123456");

    expect(result).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("sendPasswordResetEmail returns true on successful SES send", async () => {
    process.env.AWS_REGION = "eu-west-1";
    process.env.AWS_ACCESS_KEY_ID = "k";
    process.env.AWS_SECRET_ACCESS_KEY = "s";
    process.env.SES_FROM_ADDRESS = "no-reply@yourdrive.rw";
    sendMock.mockResolvedValueOnce({} as never);

    const { sendPasswordResetEmail } = await import("../email");
    const result = await sendPasswordResetEmail("a@b.com", "654321");

    expect(result).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const cmd = (sendMock.mock.calls[0] as unknown[])[0] as {
      input: { Destination: { ToAddresses: string[] } };
    };
    expect(cmd.input.Destination.ToAddresses).toEqual(["a@b.com"]);
  });

  test("sendPasswordResetEmail returns false and logs warning on SES error", async () => {
    process.env.AWS_REGION = "eu-west-1";
    process.env.AWS_ACCESS_KEY_ID = "k";
    process.env.AWS_SECRET_ACCESS_KEY = "s";
    process.env.SES_FROM_ADDRESS = "no-reply@yourdrive.rw";
    sendMock.mockRejectedValueOnce(new Error("Throttling") as never);

    const { sendPasswordResetEmail } = await import("../email");
    const result = await sendPasswordResetEmail("a@b.com", "111111");

    expect(result).toBe(false);
    expect(warnMock).toHaveBeenCalledWith(
      "[email] SES send failed",
      expect.objectContaining({ err: "Throttling", to: "a@b.com" })
    );
  });

  test("other helpers remain no-ops", async () => {
    delete process.env.AWS_REGION;

    const mod = await import("../email");
    expect(await mod.sendWelcomeEmail()).toBe(false);
    expect(await mod.sendBookingConfirmationEmail()).toBe(false);
    expect(await mod.sendPaymentReceiptEmail()).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
