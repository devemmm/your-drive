// Resolves the latest published ride for a driver. Inputs:
//   MAESTRO_DRIVER_ID
// Output: output.rideId
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const driverId = MAESTRO_DRIVER_ID;
if (!driverId) throw new Error('latest-ride: MAESTRO_DRIVER_ID is required');

const res = http.get(`${apiUrl}/api/v1/test/users/${driverId}/latest-ride`, {
  headers: { 'x-test-token': token },
});
if (res.status !== 200) throw new Error(`latest-ride failed: ${res.status} ${res.body}`);
const data = json(res.body).data;
output.rideId = String(data.rideId);
