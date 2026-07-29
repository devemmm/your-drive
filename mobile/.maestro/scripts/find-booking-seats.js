// Resolves the latest booking on a ride for a passenger, including seat count
// and ALL attendance codes (multi-seat bookings). Inputs:
//   MAESTRO_RIDE_ID
//   MAESTRO_PASSENGER_ID
//   MAESTRO_EXPECT_SEATS (optional) — throws if the booking's seats differ
// Outputs: output.bookingId, output.seats, output.code0, output.code1, ...
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const rideId = MAESTRO_RIDE_ID;
const passengerId = MAESTRO_PASSENGER_ID;
if (!rideId || !passengerId) throw new Error('find-booking-seats: MAESTRO_RIDE_ID and MAESTRO_PASSENGER_ID are required');

const res = http.get(`${apiUrl}/api/v1/test/rides/${rideId}/booking-for-passenger/${passengerId}`, {
  headers: { 'x-test-token': token },
});
if (res.status !== 200) throw new Error(`find-booking-seats failed: ${res.status} ${res.body}`);
const data = json(res.body).data;
output.bookingId = String(data.bookingId);
output.seats = String(data.seats);
const codes = data.attendanceCodes || [];
for (let i = 0; i < codes.length; i++) output['code' + i] = codes[i];

if (MAESTRO_EXPECT_SEATS && String(data.seats) !== String(MAESTRO_EXPECT_SEATS)) {
  throw new Error(`Expected ${MAESTRO_EXPECT_SEATS} seats, booking has ${data.seats} (codes: ${codes.length})`);
}
if (MAESTRO_EXPECT_SEATS && codes.length !== Number(MAESTRO_EXPECT_SEATS)) {
  throw new Error(`Expected ${MAESTRO_EXPECT_SEATS} attendance codes, got ${codes.length}`);
}
