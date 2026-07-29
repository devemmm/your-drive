// Marks the first non-expired BookingSeat as boarded. Inputs:
//   MAESTRO_BOOKING_ID — booking id to board
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const id = MAESTRO_BOOKING_ID;
if (!id) throw new Error('board-booking: MAESTRO_BOOKING_ID is required');

const res = http.post(`${apiUrl}/api/v1/test/bookings/${id}/board`, {
  headers: { 'x-test-token': token, 'Content-Type': 'application/json' },
  body: '{}',
});
if (res.status !== 200) throw new Error(`board-booking failed: ${res.status} ${res.body}`);
