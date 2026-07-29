// Resolves the latest booking on a ride for a passenger. Inputs:
//   MAESTRO_RIDE_ID
//   MAESTRO_PASSENGER_ID
// Output: output.bookingId
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const rideId = MAESTRO_RIDE_ID;
const passengerId = MAESTRO_PASSENGER_ID;
if (!rideId || !passengerId) throw new Error('find-booking: MAESTRO_RIDE_ID and MAESTRO_PASSENGER_ID are required');

const res = http.get(`${apiUrl}/api/v1/test/rides/${rideId}/booking-for-passenger/${passengerId}`, {
  headers: { 'x-test-token': token },
});
if (res.status !== 200) throw new Error(`find-booking failed: ${res.status} ${res.body}`);
const data = json(res.body).data;
output.bookingId = String(data.bookingId);
