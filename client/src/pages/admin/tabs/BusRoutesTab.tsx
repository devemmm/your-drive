import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";
import {
  useBusRoutes,
  useCreateBusRoute,
  useReplaceRouteStops,
  type BusRoute,
  type Stop,
} from "@/hooks/useBusRoutes";
import { useBusOperators } from "@/hooks/useBusOperators";

export const BusRoutesTab: React.FC = () => {
  const { data: routes, isLoading } = useBusRoutes();
  const { data: operators } = useBusOperators();
  const create = useCreateBusRoute();
  const replaceStops = useReplaceRouteStops();

  const [form, setForm] = useState({
    operatorId: 0,
    originCity: "",
    destCity: "",
    distanceKm: 0,
    basePrice: 0,
    isActive: true,
  });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [stopEdits, setStopEdits] = useState<Stop[]>([]);

  if (isLoading) return <Loader2 className="animate-spin" />;

  const submitRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      operatorId: form.operatorId,
      originCity: form.originCity,
      destCity: form.destCity,
      distanceKm: form.distanceKm,
      basePrice: String(form.basePrice),
      isActive: form.isActive,
      stops: [],
    } as any);
    setForm({
      operatorId: 0,
      originCity: "",
      destCity: "",
      distanceKm: 0,
      basePrice: 0,
      isActive: true,
    });
  };

  const openStops = (r: BusRoute) => {
    setExpanded(r.id);
    setStopEdits(
      r.stops.map((s) => ({
        name: s.name,
        city: s.city,
        order: s.order,
        latitude: s.latitude,
        longitude: s.longitude,
      }))
    );
  };

  const moveStop = (i: number, delta: number) => {
    const next = [...stopEdits];
    const j = i + delta;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    next.forEach((s, idx) => (s.order = idx));
    setStopEdits(next);
  };

  const addStop = () =>
    setStopEdits([
      ...stopEdits,
      { name: "", city: "", order: stopEdits.length },
    ]);

  const removeStop = (i: number) =>
    setStopEdits(
      stopEdits
        .filter((_, idx) => idx !== i)
        .map((s, idx) => ({ ...s, order: idx }))
    );

  const saveStops = async () => {
    if (expanded == null) return;
    await replaceStops.mutateAsync({ id: expanded, stops: stopEdits });
    setExpanded(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create route</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitRoute} className="grid grid-cols-2 gap-3">
            <select
              className="border rounded p-2"
              value={form.operatorId}
              onChange={(e) =>
                setForm({ ...form, operatorId: Number(e.target.value) })
              }
              required
            >
              <option value={0} disabled>
                Select operator
              </option>
              {(operators ?? []).map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.firstName} {o.lastName}
                </option>
              ))}
            </select>
            <Input
              placeholder="Origin city"
              value={form.originCity}
              onChange={(e) => setForm({ ...form, originCity: e.target.value })}
              required
            />
            <Input
              placeholder="Destination city"
              value={form.destCity}
              onChange={(e) => setForm({ ...form, destCity: e.target.value })}
              required
            />
            <Input
              placeholder="Distance (km)"
              type="number"
              value={form.distanceKm}
              onChange={(e) =>
                setForm({ ...form, distanceKm: Number(e.target.value) })
              }
              required
            />
            <Input
              placeholder="Base price"
              type="number"
              value={form.basePrice}
              onChange={(e) =>
                setForm({ ...form, basePrice: Number(e.target.value) })
              }
              required
            />
            <Button
              type="submit"
              className="col-span-2"
              disabled={create.isPending}
            >
              <Plus size={16} className="mr-1" /> Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Routes ({routes?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>Operator</th>
                <th>Origin</th>
                <th>Dest</th>
                <th>Stops</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {routes?.map((r) => (
                <React.Fragment key={r.id}>
                  <tr className="border-t">
                    <td className="py-2">
                      {r.operator?.firstName} {r.operator?.lastName}
                    </td>
                    <td>{r.originCity}</td>
                    <td>{r.destCity}</td>
                    <td>{r.stops?.length ?? 0}</td>
                    <td>{r.basePrice}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openStops(r)}
                      >
                        Edit stops
                      </Button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr>
                      <td colSpan={6} className="bg-gray-50 p-3">
                        <div className="space-y-2">
                          {stopEdits.map((s, i) => (
                            <div key={i} className="flex gap-2 items-center">
                              <Input
                                className="flex-1"
                                placeholder="Name"
                                value={s.name}
                                onChange={(e) => {
                                  const n = [...stopEdits];
                                  n[i].name = e.target.value;
                                  setStopEdits(n);
                                }}
                              />
                              <Input
                                className="flex-1"
                                placeholder="City"
                                value={s.city}
                                onChange={(e) => {
                                  const n = [...stopEdits];
                                  n[i].city = e.target.value;
                                  setStopEdits(n);
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveStop(i, -1)}
                              >
                                <ArrowUp size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveStop(i, 1)}
                              >
                                <ArrowDown size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeStop(i)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={addStop}>
                              <Plus size={14} /> Add stop
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveStops}
                              disabled={replaceStops.isPending}
                            >
                              <Save size={14} /> Save stops
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpanded(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
