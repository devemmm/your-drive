// Reads the latest OTP for the user identified by ${OTP_PHONE} or ${OTP_EMAIL}.
// Exposes the code as output.otp.

const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;

const phone = OTP_PHONE;
const email = OTP_EMAIL;

if (!phone && !email) {
  throw new Error('fetch-otp: set OTP_PHONE or OTP_EMAIL env before calling');
}

const qs = phone ? `phone=${encodeURIComponent(phone)}` : `email=${encodeURIComponent(email)}`;
const res = http.get(`${apiUrl}/api/v1/test/otp?${qs}`, {
  headers: { 'x-test-token': token },
});

if (res.status !== 200) {
  throw new Error(`fetch-otp failed: ${res.status} ${res.body}`);
}

const data = json(res.body).data;
const code = data.phoneVerificationCode || data.verificationCode;
if (!code) throw new Error('fetch-otp: no code present on user');
output.otp = code;
