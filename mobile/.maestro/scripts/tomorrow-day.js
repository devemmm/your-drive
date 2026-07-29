// Outputs tomorrow's day-of-month for tapping in the iOS inline calendar.
// Booking tomorrow (not today) sidesteps the same-day timezone validation
// gotcha (server UTC vs CAT+2).
const d = new Date();
d.setDate(d.getDate() + 1);
output.tomorrowDay = String(d.getDate());
