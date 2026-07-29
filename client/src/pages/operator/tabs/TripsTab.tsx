import { useState } from "react";
import { useOperatorTrips, useCreateOperatorTrip, useOperatorRoutes, useOperatorBuses, useSwapTripBus } from "@/hooks/useOperator";

// One-time trips: a single extra departure that isn't part of the recurring
// timetable (e.g. an added bus for a busy period). The recurring timetable is
// managed on the Schedules tab.
export default function TripsTab() {
  const { data: trips = [], isLoading } = useOperatorTrips();
  const { data: routes = [] } = useOperatorRoutes();
  const { data: buses = [] } = useOperatorBuses();
  const createTrip = useCreateOperatorTrip();
  const swapBus = useSwapTripBus();
  const [form, setForm] = useState({ routeId: "", vehicleId: "", departureTime: "", availableSeats: "" });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    createTrip.mutate(
      {
        routeId: Number(form.routeId),
        vehicleId: Number(form.vehicleId),
        departureTime: new Date(form.departureTime).toISOString(),
        availableSeats: Number(form.availableSeats),
      },
      { onSuccess: () => setForm({ routeId: "", vehicleId: "", departureTime: "", availableSeats: "" }) }
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">One-time trips</p>
        <p>
          Schedule a single extra departure that isn’t part of your recurring timetable — for example,
          adding a bus for a busy holiday or event on a specific date and time. For departures that run
          regularly, use the <span className="font-medium">Schedules</span> tab instead.
        </p>
      </div>

      {/* One-off trip form */}
      <form onSubmit={submit} className="grid grid-cols-2 gap-4 max-w-2xl">
        <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
          Route
          <select className="border rounded px-3 py-2 text-foreground" value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })} required>
            <option value="">Select route</option>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.originCity} → {r.destCity}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
          Bus
          <select className="border rounded px-3 py-2 text-foreground" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} required>
            <option value="">Select bus</option>
            {buses.map((b) => <option key={b.id} value={b.id}>{b.make} {b.model} ({b.plateNumber})</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
          Departure date &amp; time
          <input className="border rounded px-3 py-2 text-foreground" type="datetime-local" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} required />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
          Available seats
          <input className="border rounded px-3 py-2 text-foreground" type="number" min={1} placeholder="e.g. 35" value={form.availableSeats} onChange={(e) => setForm({ ...form, availableSeats: e.target.value })} required />
        </label>
        <button type="submit" className="col-span-2 bg-primary text-white rounded px-4 py-2 disabled:opacity-50" disabled={createTrip.isPending}>
          {createTrip.isPending ? "Scheduling..." : "Schedule one-time trip"}
        </button>
      </form>

      {isLoading ? <p>Loading…</p> : (
        <table className="w-full text-sm border-collapse">
          <thead><tr className="text-left border-b"><th className="py-2">Route</th><th>Bus</th><th>Departs</th><th>Seats</th><th>Fare</th><th>Change bus</th></tr></thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.id} className="border-b">
                <td className="py-2">{t.route ? `${t.route.originCity} → ${t.route.destCity}` : "—"}</td>
                <td>{t.vehicle ? `${t.vehicle.make} ${t.vehicle.model}` : "—"}</td>
                <td>{new Date(t.departureTime).toLocaleString()}</td>
                <td>{t.availableSeats}/{t.totalSeats}</td>
                <td>{t.contribution}</td>
                <td>
                  <select
                    key={`bus-${t.id}-${t.vehicle?.id ?? "none"}-${swapBus.isPending ? "p" : ""}`}
                    className="border rounded px-2 py-1 text-xs"
                    defaultValue=""
                    disabled={swapBus.isPending}
                    onChange={(e) => {
                      if (e.target.value) swapBus.mutate({ tripId: t.id, vehicleId: Number(e.target.value) });
                    }}
                  >
                    <option value="">Change…</option>
                    {buses.map((b) => <option key={b.id} value={b.id}>{b.make} {b.model} ({b.plateNumber})</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {trips.length === 0 && <tr><td colSpan={6} className="py-4 text-muted-foreground">No upcoming trips yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
