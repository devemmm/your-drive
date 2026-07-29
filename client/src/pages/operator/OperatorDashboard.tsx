import { useState } from "react";
import BusesTab from "./tabs/BusesTab";
import RoutesTab from "./tabs/RoutesTab";
import TripsTab from "./tabs/TripsTab";
import SchedulesTab from "./tabs/SchedulesTab";
import PassengersTab from "./tabs/PassengersTab";

// Schedules (the recurring timetable) comes before Trips (one-time departures):
// setting up the repeating timetable is the primary flow.
const TABS = ["buses", "routes", "schedules", "trips", "passengers"] as const;
type Tab = (typeof TABS)[number];
const LABELS: Record<Tab, string> = { buses: "My Buses", routes: "My Routes", schedules: "Schedules", trips: "Trips", passengers: "Passengers" };

export default function OperatorDashboard() {
  const [tab, setTab] = useState<Tab>("buses");
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Operator Dashboard</h1>
      <div className="flex gap-2 border-b mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {LABELS[t]}
          </button>
        ))}
      </div>
      {tab === "buses" && <BusesTab />}
      {tab === "routes" && <RoutesTab />}
      {tab === "schedules" && <SchedulesTab />}
      {tab === "trips" && <TripsTab />}
      {tab === "passengers" && <PassengersTab />}
    </div>
  );
}
