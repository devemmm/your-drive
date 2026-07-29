// Resolves the latest PUBLISHED ride for a driver/operator user id. Inputs:
//   MAESTRO_DRIVER_ID
// Output: output.latestRideId
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const driverId = MAESTRO_DRIVER_ID;
if (!driverId) throw new Error('latest-ride-for: MAESTRO_DRIVER_ID is required');
const res = http.get(`${apiUrl}/api/v1/test/users/${driverId}/latest-ride`, {
  headers: { 'x-test-token': token },
});
if (res.status !== 200) throw new Error(`latest-ride-for failed: ${res.status} ${res.body}`);
output.latestRideId = String(json(res.body).data.rideId);
