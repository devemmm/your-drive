// Transitions a ride's status. Inputs:
//   MAESTRO_RIDE_ID
//   MAESTRO_RIDE_STATUS — DRAFT|PUBLISHED|ONGOING|COMPLETED|CANCELLED|EXPIRED|BLOCKED
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const rideId = MAESTRO_RIDE_ID;
const status = MAESTRO_RIDE_STATUS;
if (!rideId || !status) throw new Error('set-ride-status: MAESTRO_RIDE_ID and MAESTRO_RIDE_STATUS are required');

const res = http.post(`${apiUrl}/api/v1/test/rides/${rideId}/status`, {
  headers: { 'x-test-token': token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ status }),
});
if (res.status !== 200) throw new Error(`set-ride-status failed: ${res.status} ${res.body}`);
