import { useState } from "react";
import { useOperatorTrips, useOperatorManifest } from "@/hooks/useOperator";

export default function PassengersTab() {
  const { data: trips = [] } = useOperatorTrips();
  const [tripId, setTripId] = useState<number | null>(null);
  const { data: manifest = [], isLoading } = useOperatorManifest(tripId);

  return (
    <div className="space-y-6">
      <select
        className="border rounded px-3 py-2 max-w-md"
        value={tripId ?? ""}
        onChange={(e) => setTripId(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Select a trip</option>
        {trips.map((t) => (
          <option key={t.id} value={t.id}>
            {t.route ? `${t.route.originCity} → ${t.route.destCity}` : `Trip #${t.id}`} · {new Date(t.departureTime).toLocaleString()}
          </option>
        ))}
      </select>

      {!tripId ? <p className="text-muted-foreground">Pick a trip to see its passengers.</p> :
        isLoading ? <p>Loading…</p> : (
        <table className="w-full text-sm border-collapse">
          <thead><tr className="text-left border-b"><th className="py-2">Passenger</th><th>Phone</th><th>Seats</th><th>Codes</th><th>Boarding</th><th>Alighting</th><th>Status</th></tr></thead>
          <tbody>
            {manifest.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-2">{row.booker.firstName} {row.booker.lastName}</td>
                <td>{row.booker.phoneNumber ?? "—"}</td>
                <td>{row.seats}</td>
                <td>{row.bookingSeats.map((s) => s.attendanceCode).join(", ")}</td>
                <td>{row.boardingStop ? `${row.boardingStop.name} (${row.boardingStop.city})` : "—"}</td>
                <td>{row.alightingStop ? `${row.alightingStop.name} (${row.alightingStop.city})` : "—"}</td>
                <td>{row.status}</td>
              </tr>
            ))}
            {manifest.length === 0 && <tr><td colSpan={7} className="py-4 text-muted-foreground">No bookings for this trip yet.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
