import { useRef, useState } from "react";
import { useOperatorBuses, useCreateOperatorBus, type CreateBusInput } from "@/hooks/useOperator";

const emptyText = { make: "", model: "", color: "", plateNumber: "", capacity: "" as string, year: "" as string };

export default function BusesTab() {
  const { data: buses = [], isLoading } = useOperatorBuses();
  const createBus = useCreateOperatorBus();
  const [form, setForm] = useState(emptyText);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;
    const input: CreateBusInput = {
      make: form.make,
      model: form.model,
      color: form.color,
      plateNumber: form.plateNumber,
      capacity: Number(form.capacity),
      image: imageFile,
      ...(form.year ? { year: Number(form.year) } : {}),
    };
    createBus.mutate(input, {
      onSuccess: () => {
        setForm(emptyText);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 max-w-2xl">
        <input
          className="border rounded px-3 py-2"
          placeholder="Make"
          value={form.make}
          onChange={(e) => setForm({ ...form, make: e.target.value })}
          required
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Model"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          required
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Color"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
          required
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Plate number"
          value={form.plateNumber}
          onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
          required
        />
        <input
          className="border rounded px-3 py-2"
          type="number"
          placeholder="Capacity (seats)"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          required
          min={1}
        />
        <input
          className="border rounded px-3 py-2"
          type="number"
          placeholder="Year (optional)"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
          min={1900}
          max={new Date().getFullYear() + 1}
        />
        <div className="col-span-2">
          <label className="block text-sm text-muted-foreground mb-1">
            Bus image <span className="text-red-500">*</span>
          </label>
          <input
            ref={fileInputRef}
            className="border rounded px-3 py-2 w-full"
            type="file"
            accept="image/*"
            required
            onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button
          type="submit"
          className="col-span-2 bg-primary text-white rounded px-4 py-2 disabled:opacity-50"
          disabled={createBus.isPending}
        >
          {createBus.isPending ? "Saving..." : "Add bus"}
        </button>
      </form>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Bus</th>
              <th>Plate</th>
              <th>Color</th>
              <th>Capacity</th>
            </tr>
          </thead>
          <tbody>
            {buses.map((b) => (
              <tr key={b.id} className="border-b">
                <td className="py-2">
                  {b.make} {b.model}
                  {b.year ? ` (${b.year})` : ""}
                </td>
                <td>{b.plateNumber}</td>
                <td>{b.color}</td>
                <td>{b.capacity ?? "—"}</td>
              </tr>
            ))}
            {buses.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-muted-foreground">
                  No buses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
