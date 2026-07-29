import { useState } from "react";
import { useOperatorRoutes, useOperatorBuses } from "@/hooks/useOperator";
import { useRouteDepartures, useCreateDeparture, useDeleteDeparture, useUpdateDeparture } from "@/hooks/useOperator";

// Recurring schedules: the repeating timetable for a route (a set of daily
// departure times, each on a chosen bus). Passengers browse these and book any
// upcoming date. One-off departures live on the Trips tab.
export default function SchedulesTab() {
  const { data: routes = [] } = useOperatorRoutes();
  const { data: buses = [] } = useOperatorBuses();

  const [schedRouteId, setSchedRouteId] = useState("");
  const departures = useRouteDepartures(schedRouteId ? Number(schedRouteId) : undefined);
  const addDep = useCreateDeparture();
  const delDep = useDeleteDeparture();
  const updDep = useUpdateDeparture();
  const [depTime, setDepTime] = useState("");
  const [depBus, setDepBus] = useState("");

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Recurring schedules</p>
        <p>
          These are your regular departures that repeat on a route. Pick a route, then add the times it
          runs each day and the bus for each. Passengers see these and can book them for any upcoming date.
          For a single extra departure, use the <span className="font-medium">Trips</span> tab.
        </p>
      </div>

      <section className="space-y-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground max-w-md">
          Route
          <select className="border rounded px-3 py-2 text-foreground" value={schedRouteId} onChange={(e) => setSchedRouteId(e.target.value)}>
            <option value="">Select route</option>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.originCity} → {r.destCity}</option>)}
          </select>
        </label>

        {schedRouteId && (
          <>
            <form
              className="flex gap-3 items-end"
              onSubmit={(e) => {
                e.preventDefault();
                addDep.mutate(
                  { routeId: Number(schedRouteId), timeOfDay: depTime, vehicleId: Number(depBus) },
                  { onSuccess: () => { setDepTime(""); setDepBus(""); } }
                );
              }}
            >
              <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
                Departure time
                <input type="time" className="border rounded px-3 py-2 text-foreground" value={depTime} onChange={(e) => setDepTime(e.target.value)} required />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
                Bus
                <select className="border rounded px-3 py-2 text-foreground" value={depBus} onChange={(e) => setDepBus(e.target.value)} required>
                  <option value="">Select bus</option>
                  {buses.map((b) => <option key={b.id} value={b.id}>{b.make} {b.model} ({b.plateNumber})</option>)}
                </select>
              </label>
              <button className="bg-primary text-white rounded px-4 py-2" disabled={addDep.isPending}>Add time</button>
            </form>

            <table className="w-full text-sm border-collapse">
              <thead><tr className="text-left border-b"><th className="py-2">Time</th><th>Bus</th><th>Active</th><th></th></tr></thead>
              <tbody>
                {(departures.data ?? []).map((d) => (
                  <tr key={d.id} className="border-b">
                    <td className="py-2">{d.timeOfDay}</td>
                    <td>{d.vehicle ? `${d.vehicle.make} ${d.vehicle.model}` : "—"}</td>
                    <td>
                      <button className="underline" onClick={() => updDep.mutate({ id: d.id, isActive: !d.isActive })}>
                        {d.isActive ? "Yes" : "No"}
                      </button>
                    </td>
                    <td><button className="text-red-600" onClick={() => delDep.mutate(d.id)}>Delete</button></td>
                  </tr>
                ))}
                {(departures.data ?? []).length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-muted-foreground">No departure times yet — add the first one above.</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}
