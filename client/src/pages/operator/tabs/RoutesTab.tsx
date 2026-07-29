import { useEffect, useState } from "react";
import {
  useOperatorRoutes, useCreateOperatorRoute, useDeleteOperatorRoute,
  useUpdateOperatorRoute, useReplaceOperatorRouteStops,
  type OperatorRoute, type OperatorStop,
} from "@/hooks/useOperator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

// Numeric fields start empty (not 0) so their placeholder/label shows and the
// operator can fully clear them; we coerce to Number only at submit.
const empty = { originCity: "", destCity: "", distanceKm: "", basePrice: "", isActive: true };

export default function RoutesTab() {
  const { data: routes = [], isLoading } = useOperatorRoutes();
  const createRoute = useCreateOperatorRoute();
  const deleteRoute = useDeleteOperatorRoute();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<OperatorRoute | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const distanceKm = Number(form.distanceKm);
    createRoute.mutate(
      {
        originCity: form.originCity.trim(),
        destCity: form.destCity.trim(),
        distanceKm: Number.isFinite(distanceKm) ? distanceKm : 0,
        basePrice: String(form.basePrice || "0"),
        isActive: true,
      } as Partial<OperatorRoute>,
      { onSuccess: () => setForm(empty) }
    );
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid grid-cols-2 gap-4 max-w-2xl">
        <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
          Origin city
          <input className="border rounded px-3 py-2 text-foreground" placeholder="e.g. Kigali" value={form.originCity} onChange={(e) => setForm({ ...form, originCity: e.target.value })} required />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
          Destination city
          <input className="border rounded px-3 py-2 text-foreground" placeholder="e.g. Huye" value={form.destCity} onChange={(e) => setForm({ ...form, destCity: e.target.value })} required />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
          Distance (km)
          <input className="border rounded px-3 py-2 text-foreground" type="number" min={0} placeholder="e.g. 135" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
          Base fare (RWF)
          <input className="border rounded px-3 py-2 text-foreground" type="number" min={0} placeholder="e.g. 5000" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} />
        </label>
        <button type="submit" className="col-span-2 bg-primary text-white rounded px-4 py-2 disabled:opacity-50" disabled={createRoute.isPending}>
          {createRoute.isPending ? "Saving..." : "Add route"}
        </button>
      </form>

      {isLoading ? <p>Loading…</p> : (
        <table className="w-full text-sm border-collapse">
          <thead><tr className="text-left border-b"><th className="py-2">Route</th><th>Stops</th><th>Distance</th><th>Fare</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {routes.map((r) => (
              <tr
                key={r.id}
                className="border-b hover:bg-muted/50 cursor-pointer"
                onClick={() => setEditing(r)}
                title="Click to edit route and stops"
              >
                <td className="py-2 font-medium">{r.originCity} → {r.destCity}</td>
                <td>{r.stops?.length ?? 0}</td>
                <td>{r.distanceKm} km</td>
                <td>{r.basePrice}</td>
                <td>{r.isActive ? "Yes" : "No"}</td>
                <td>
                  <button
                    className="text-red-600"
                    onClick={(e) => { e.stopPropagation(); deleteRoute.mutate(r.id); }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {routes.length === 0 && <tr><td colSpan={6} className="py-4 text-muted-foreground">No routes yet.</td></tr>}
          </tbody>
        </table>
      )}

      {editing && (
        <RouteEditorDialog route={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

// --- Route editor: edit route fields + manage its (route-level) stopover points ---

function RouteEditorDialog({ route, onClose }: { route: OperatorRoute; onClose: () => void }) {
  const updateRoute = useUpdateOperatorRoute();
  const replaceStops = useReplaceOperatorRouteStops();

  const [fields, setFields] = useState({
    originCity: route.originCity,
    destCity: route.destCity,
    distanceKm: String(route.distanceKm ?? ""),
    basePrice: String(route.basePrice ?? ""),
    isActive: route.isActive,
  });
  // Keep the full stop shape (incl. any lat/long) in state; the replace endpoint
  // deletes+recreates, so we resend coordinates to avoid dropping them.
  const [stops, setStops] = useState<OperatorStop[]>(() =>
    (route.stops ?? []).map((s) => ({ ...s }))
  );

  // Reseed if a different route is opened.
  useEffect(() => {
    setFields({
      originCity: route.originCity,
      destCity: route.destCity,
      distanceKm: String(route.distanceKm ?? ""),
      basePrice: String(route.basePrice ?? ""),
      isActive: route.isActive,
    });
    setStops((route.stops ?? []).map((s) => ({ ...s })));
  }, [route]);

  const addStop = () => setStops((prev) => [...prev, { name: "", city: "", order: prev.length }]);
  const removeStop = (i: number) => setStops((prev) => prev.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setStops((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const setStopField = (i: number, key: "name" | "city", value: string) =>
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));

  const saving = updateRoute.isPending || replaceStops.isPending;

  const save = async () => {
    const distanceKm = Number(fields.distanceKm);
    await updateRoute.mutateAsync({
      id: route.id,
      originCity: fields.originCity.trim(),
      destCity: fields.destCity.trim(),
      distanceKm: Number.isFinite(distanceKm) ? distanceKm : 0,
      basePrice: String(fields.basePrice || "0"),
      isActive: fields.isActive,
    });
    // Normalize order to list position; drop blank rows. Send ONLY the columns the
    // backend inserts (it spreads each stop into createMany) — never id/routeId.
    const cleaned: OperatorStop[] = stops
      .filter((s) => s.name.trim() && s.city.trim())
      .map((s, index) => {
        const stop: OperatorStop = { name: s.name.trim(), city: s.city.trim(), order: index };
        if (typeof s.latitude === "number") stop.latitude = s.latitude;
        if (typeof s.longitude === "number") stop.longitude = s.longitude;
        return stop;
      });
    await replaceStops.mutateAsync({ id: route.id, stops: cleaned });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit route</DialogTitle>
          <DialogDescription>
            Update the route details and its stopover points. Stops apply to every trip scheduled on this route.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
            Origin city
            <input className="border rounded px-3 py-2 text-foreground" value={fields.originCity} onChange={(e) => setFields({ ...fields, originCity: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
            Destination city
            <input className="border rounded px-3 py-2 text-foreground" value={fields.destCity} onChange={(e) => setFields({ ...fields, destCity: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
            Distance (km)
            <input className="border rounded px-3 py-2 text-foreground" type="number" min={0} placeholder="e.g. 135" value={fields.distanceKm} onChange={(e) => setFields({ ...fields, distanceKm: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
            Base fare (RWF)
            <input className="border rounded px-3 py-2 text-foreground" type="number" min={0} placeholder="e.g. 5000" value={fields.basePrice} onChange={(e) => setFields({ ...fields, basePrice: e.target.value })} />
          </label>
          <label className="col-span-2 flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={fields.isActive} onChange={(e) => setFields({ ...fields, isActive: e.target.checked })} />
            Route is active (visible to passengers)
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Stopover points</h4>
            <button type="button" className="text-sm text-primary underline" onClick={addStop}>+ Add stop</button>
          </div>
          {stops.length === 0 && <p className="text-sm text-muted-foreground">No stops yet. Passengers board at the origin and alight at the destination.</p>}
          <div className="space-y-2">
            {stops.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-xs text-muted-foreground text-right">{i + 1}.</span>
                <input className="border rounded px-3 py-2 flex-1" placeholder="Stop name (e.g. Nyanza Town)" value={s.name} onChange={(e) => setStopField(i, "name", e.target.value)} />
                <input className="border rounded px-3 py-2 flex-1" placeholder="City (e.g. Nyanza)" value={s.city} onChange={(e) => setStopField(i, "city", e.target.value)} />
                <button type="button" className="px-2 text-muted-foreground disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
                <button type="button" className="px-2 text-muted-foreground disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === stops.length - 1} title="Move down">↓</button>
                <button type="button" className="px-2 text-red-600" onClick={() => removeStop(i)} title="Remove">✕</button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <button type="button" className="rounded px-4 py-2 border" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="button" className="bg-primary text-white rounded px-4 py-2 disabled:opacity-50" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
