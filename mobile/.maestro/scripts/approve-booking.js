// Marks a booking as APPROVED. Inputs:
//   MAESTRO_BOOKING_ID — booking id to approve
const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;
const id = MAESTRO_BOOKING_ID;
if (!id) throw new Error('approve-booking: MAESTRO_BOOKING_ID is required');

const res = http.post(`${apiUrl}/api/v1/test/bookings/${id}/approve`, {
  headers: { 'x-test-token': token, 'Content-Type': 'application/json' },
  body: '{}',
});
if (res.status !== 200) throw new Error(`approve-booking failed: ${res.status} ${res.body}`);
