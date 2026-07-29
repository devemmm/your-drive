// Maestro JS runScript — see https://maestro.mobile.dev/advanced/javascript-runscript
// Hits POST /api/test/reset on the test backend and exposes seeded fixture
// values back to the calling flow via output.* (read as ${OUTPUT.*}).

const apiUrl = MAESTRO_TEST_API_URL;
const token = MAESTRO_TEST_AUTH_TOKEN;

const res = http.post(`${apiUrl}/api/v1/test/reset`, {
  headers: { 'x-test-token': token, 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});

if (res.status !== 200) {
  throw new Error(`Test reset failed: ${res.status} ${res.body}`);
}

const payload = json(res.body).data;
output.password = payload.password;

for (const u of payload.users) {
  if (u.role === 'passenger' && !output.passengerEmail) {
    output.passengerEmail = u.email;
    output.passengerPhone = u.phoneNumber;
    output.passengerId = String(u.id);
  }
  if (u.role === 'driver' && !output.driverEmail) {
    output.driverEmail = u.email;
    output.driverPhone = u.phoneNumber;
    output.driverId = String(u.id);
  }
}

output.registerEmail = payload.registerTarget.email;
output.registerPhone = payload.registerTarget.phoneNumber;

if (payload.inviter) {
  output.inviterId = String(payload.inviter.id);
  output.inviterEmail = payload.inviter.email;
  output.inviterReferralCode = payload.inviter.referralCode;
}

if (payload.bus) {
  output.busRideId = String(payload.bus.rideId);
  output.busVehicleId = String(payload.bus.vehicleId);
  output.busDriverId = String(payload.bus.driverId);
  output.busDepartureLocationId = String(payload.bus.departureLocationId);
  output.busDestinationLocationId = String(payload.bus.destinationLocationId);
}

if (payload.operator) {
  output.operatorId = String(payload.operator.id);
  output.operatorEmail = payload.operator.email;
  output.operatorRouteId = String(payload.operator.routeId);
  output.operatorRouteDepartureId = String(payload.operator.routeDepartureId);
}
