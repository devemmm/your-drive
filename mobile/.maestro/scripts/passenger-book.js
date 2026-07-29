// Books a ride as a passenger (server-side, bypasses UI). Inputs:
//   MAESTRO_RIDE_ID
//   MAESTRO_PASSENGER_ID
// Output: output.bookingId, output.attendanceCode
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const rideId = MAESTRO_RIDE_ID;
const passengerId = MAESTRO_PASSENGER_ID;
if (!rideId || !passengerId) throw new Error('passenger-book: MAESTRO_RIDE_ID and MAESTRO_PASSENGER_ID are required');

const res = http.post(`${apiUrl}/api/v1/test/rides/${rideId}/book`, {
  headers: { 'x-test-token': token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ passengerId: Number(passengerId), seats: 1 }),
});
if (res.status !== 200) throw new Error(`passenger-book failed: ${res.status} ${res.body}`);
const data = json(res.body).data;
output.bookingId = String(data.id);
output.attendanceCode = data.attendanceCode;
