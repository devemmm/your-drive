// Hits GET /api/v1/test/users/by-email/:email and asserts the freshly
// registered user is linked to the expected inviter via receivedReferral.
// Exposes the resolved inviter id back to the flow as output.referredById.

const baseUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const email = output.registerEmail;
const expectedInviterId = parseInt(output.inviterId, 10);

if (!email) {
  throw new Error('fetch-referral: output.registerEmail is not set');
}
if (!Number.isFinite(expectedInviterId)) {
  throw new Error('fetch-referral: output.inviterId is not set or not numeric');
}

const resp = http.get(`${baseUrl}/api/v1/test/users/by-email/${encodeURIComponent(email)}`, {
  headers: { 'x-test-token': token },
});

if (resp.status !== 200) {
  throw new Error(`fetch-referral failed: ${resp.status} ${resp.body}`);
}

const body = json(resp.body);
const actualInviterId = body && body.data && body.data.receivedReferral
  ? body.data.receivedReferral.inviterId
  : null;

if (actualInviterId !== expectedInviterId) {
  throw new Error(`expected referredById=${expectedInviterId}, got ${actualInviterId}`);
}

output.referredById = String(actualInviterId);
