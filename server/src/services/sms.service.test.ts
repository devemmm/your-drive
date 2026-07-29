import { jest } from "@jest/globals";

const snsSendMock = jest.fn();
jest.mock("@aws-sdk/client-sns", () => ({
  SNSClient: jest.fn().mockImplementation(() => ({ send: snsSendMock })),
  PublishCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const twilioCreateMock = jest.fn();
jest.mock("twilio", () => ({
  Twilio: jest.fn().mockImplementation(() => ({
    messages: { create: twilioCreateMock },
  })),
}));

jest.mock("pindo-sms", () => ({
  PindoSMS: jest.fn().mockImplementation(() => ({})),
}));

const warnMock = jest.fn();
const errorMock = jest.fn();
jest.mock("../utils/logger", () => ({
  logger: { warn: warnMock, info: jest.fn(), error: errorMock },
}));

const AWS_ENV = {
  AWS_REGION: "eu-west-1",
  AWS_ACCESS_KEY_ID: "k",
  AWS_SECRET_ACCESS_KEY: "s",
};

const TWILIO_ENV = {
  TWILIO_ACCOUNT_SID: "AC00000000000000000000000000000000",
  TWILIO_AUTH_TOKEN: "t",
  TWILIO_PHONE_NUMBER: "+15005550006",
};

describe("SmsService.sendSMS — provider dispatch", () => {
  const ORIGINAL_ENV = { ...process.env };

  const loadService = async () => {
    const { SmsService } = await import("./sms.service");
    return SmsService;
  };

  beforeEach(() => {
    jest.resetModules();
    snsSendMock.mockReset();
    twilioCreateMock.mockReset();
    warnMock.mockReset();
    errorMock.mockReset();
    process.env = { ...ORIGINAL_ENV };
    process.env.NODE_ENV = "production";
    delete process.env.SMS_PROVIDER;
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.SMS_SENDER_ID;
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("defaults to SNS when SMS_PROVIDER is unset", async () => {
    Object.assign(process.env, AWS_ENV);
    snsSendMock.mockResolvedValueOnce({} as never);

    const SmsService = await loadService();
    const result = await SmsService.sendSMS("+263771846532", "hello");

    expect(result).toBe(true);
    expect(snsSendMock).toHaveBeenCalledTimes(1);
    expect(twilioCreateMock).not.toHaveBeenCalled();
    const cmd = (snsSendMock.mock.calls[0] as unknown[])[0] as {
      input: {
        PhoneNumber: string;
        Message: string;
        MessageAttributes: Record<string, { StringValue: string }>;
      };
    };
    expect(cmd.input.PhoneNumber).toBe("+263771846532");
    expect(cmd.input.Message).toBe("hello");
    expect(cmd.input.MessageAttributes["AWS.SNS.SMS.SMSType"].StringValue).toBe(
      "Transactional"
    );
  });

  test("uses Twilio when SMS_PROVIDER=twilio", async () => {
    Object.assign(process.env, TWILIO_ENV);
    process.env.SMS_PROVIDER = "twilio";
    twilioCreateMock.mockResolvedValueOnce({} as never);

    const SmsService = await loadService();
    const result = await SmsService.sendSMS("+263771846532", "hello");

    expect(result).toBe(true);
    expect(twilioCreateMock).toHaveBeenCalledWith({
      body: "hello",
      to: "+263771846532",
      from: TWILIO_ENV.TWILIO_PHONE_NUMBER,
    });
    expect(snsSendMock).not.toHaveBeenCalled();
  });

  test("uses SNS when SMS_PROVIDER=sns even if Twilio is also configured", async () => {
    Object.assign(process.env, AWS_ENV, TWILIO_ENV);
    process.env.SMS_PROVIDER = "sns";
    snsSendMock.mockResolvedValueOnce({} as never);

    const SmsService = await loadService();
    const result = await SmsService.sendSMS("+263771846532", "hello");

    expect(result).toBe(true);
    expect(snsSendMock).toHaveBeenCalledTimes(1);
    expect(twilioCreateMock).not.toHaveBeenCalled();
  });

  test("returns false and warns when selected provider is not configured", async () => {
    process.env.SMS_PROVIDER = "sns"; // no AWS creds set

    const SmsService = await loadService();
    const result = await SmsService.sendSMS("+263771846532", "hello");

    expect(result).toBe(false);
    expect(snsSendMock).not.toHaveBeenCalled();
    expect(warnMock).toHaveBeenCalled();
  });

  test("returns false and warns on unknown SMS_PROVIDER value", async () => {
    Object.assign(process.env, AWS_ENV, TWILIO_ENV);
    process.env.SMS_PROVIDER = "smoke-signals";

    const SmsService = await loadService();
    const result = await SmsService.sendSMS("+263771846532", "hello");

    expect(result).toBe(false);
    expect(snsSendMock).not.toHaveBeenCalled();
    expect(twilioCreateMock).not.toHaveBeenCalled();
    expect(warnMock).toHaveBeenCalled();
  });

  test("development skips sending when SMS_PROVIDER is unset", async () => {
    process.env.NODE_ENV = "development";
    Object.assign(process.env, AWS_ENV);

    const SmsService = await loadService();
    const result = await SmsService.sendSMS("+263771846532", "hello");

    expect(result).toBe(true);
    expect(snsSendMock).not.toHaveBeenCalled();
    expect(twilioCreateMock).not.toHaveBeenCalled();
  });

  test("development sends for real when SMS_PROVIDER is explicitly set", async () => {
    process.env.NODE_ENV = "development";
    Object.assign(process.env, AWS_ENV);
    process.env.SMS_PROVIDER = "sns";
    snsSendMock.mockResolvedValueOnce({} as never);

    const SmsService = await loadService();
    const result = await SmsService.sendSMS("+263771846532", "hello");

    expect(result).toBe(true);
    expect(snsSendMock).toHaveBeenCalledTimes(1);
  });

  test("uses SMS_SENDER_ID env as the SNS sender id", async () => {
    Object.assign(process.env, AWS_ENV);
    process.env.SMS_SENDER_ID = "YourDrive";
    snsSendMock.mockResolvedValueOnce({} as never);

    const SmsService = await loadService();
    await SmsService.sendSMS("+263771846532", "hello");

    const cmd = (snsSendMock.mock.calls[0] as unknown[])[0] as {
      input: { MessageAttributes: Record<string, { StringValue: string }> };
    };
    expect(cmd.input.MessageAttributes["AWS.SNS.SMS.SenderID"].StringValue).toBe(
      "YourDrive"
    );
  });

  test("omits SenderID attribute when SMS_SENDER_ID is unset", async () => {
    Object.assign(process.env, AWS_ENV);
    snsSendMock.mockResolvedValueOnce({} as never);

    const SmsService = await loadService();
    await SmsService.sendSMS("+263771846532", "hello");

    const cmd = (snsSendMock.mock.calls[0] as unknown[])[0] as {
      input: { MessageAttributes: Record<string, unknown> };
    };
    expect(cmd.input.MessageAttributes["AWS.SNS.SMS.SenderID"]).toBeUndefined();
  });

  test("throws and logs when the SNS send fails", async () => {
    Object.assign(process.env, AWS_ENV);
    snsSendMock.mockRejectedValueOnce(new Error("sandbox: number not verified") as never);

    const SmsService = await loadService();

    await expect(
      SmsService.sendSMS("+263771846532", "hello")
    ).rejects.toThrow("sandbox: number not verified");
    expect(errorMock).toHaveBeenCalled();
  });

  test("throws and logs when the Twilio send fails", async () => {
    Object.assign(process.env, TWILIO_ENV);
    process.env.SMS_PROVIDER = "twilio";
    twilioCreateMock.mockRejectedValueOnce(new Error("auth error") as never);

    const SmsService = await loadService();

    await expect(
      SmsService.sendSMS("+263771846532", "hello")
    ).rejects.toThrow("auth error");
    expect(errorMock).toHaveBeenCalled();
  });
});
