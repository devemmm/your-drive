import { useState } from "react";
import { Plus, Edit, Trash2, Check, X, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/LoadingSkeleton";
import {
  PricingRule,
  PricingRuleInput,
  RideType,
  VehicleCategory,
  useCreatePricingRule,
  useDeletePricingRule,
  usePricingSettings,
  useUpdatePricingRule,
} from "@/hooks/usePricingSettings";

const CATEGORIES: VehicleCategory[] = ["CAR", "MOTORBIKE", "BUS"];
const RIDE_TYPES: RideType[] = ["P2P", "D2D"];

const emptyDraft: PricingRuleInput = {
  vehicleCategory: "CAR",
  rideType: "D2D",
  baseFare: 1000,
  perKm: 300,
  perMinute: 50,
  minimumFare: 1500,
  commissionPercent: 10,
  currency: "RWF",
};

function NumberField({
  label,
  value,
  onChange,
  step = 1,
}: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <label className="flex flex-col text-xs gap-1">
      <span className="text-muted-foreground">{label}</span>
      <Input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-28"
      />
    </label>
  );
}

function RuleRow({ rule, onSaved }: { rule: PricingRule; onSaved: () => void }) {
  const update = useUpdatePricingRule();
  const remove = useDeletePricingRule();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    baseFare: Number(rule.baseFare),
    perKm: Number(rule.perKm),
    perMinute: Number(rule.perMinute),
    minimumFare: Number(rule.minimumFare),
    commissionPercent: Number(rule.commissionPercent),
  });

  async function handleSave() {
    await update.mutateAsync({ id: rule.id, ...draft });
    setEditing(false);
    onSaved();
  }

  async function handleToggleActive() {
    await update.mutateAsync({ id: rule.id, isActive: !rule.isActive });
    onSaved();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete pricing rule ${rule.vehicleCategory} × ${rule.rideType}?`)) return;
    await remove.mutateAsync(rule.id);
    onSaved();
  }

  return (
    <TableRow>
      <TableCell>
        <Badge variant="outline">{rule.vehicleCategory}</Badge>
        <span className="mx-2 text-muted-foreground">×</span>
        <Badge variant="outline">{rule.rideType}</Badge>
      </TableCell>
      {editing ? (
        <>
          <TableCell><NumberField label="" value={draft.baseFare} onChange={(v) => setDraft({ ...draft, baseFare: v })} /></TableCell>
          <TableCell><NumberField label="" value={draft.perKm} onChange={(v) => setDraft({ ...draft, perKm: v })} /></TableCell>
          <TableCell><NumberField label="" value={draft.perMinute} onChange={(v) => setDraft({ ...draft, perMinute: v })} /></TableCell>
          <TableCell><NumberField label="" value={draft.minimumFare} onChange={(v) => setDraft({ ...draft, minimumFare: v })} /></TableCell>
          <TableCell><NumberField label="" value={draft.commissionPercent} onChange={(v) => setDraft({ ...draft, commissionPercent: v })} step={0.5} /></TableCell>
        </>
      ) : (
        <>
          <TableCell className="text-right font-mono">{Number(rule.baseFare).toLocaleString()}</TableCell>
          <TableCell className="text-right font-mono">{Number(rule.perKm).toLocaleString()}</TableCell>
          <TableCell className="text-right font-mono">{Number(rule.perMinute).toLocaleString()}</TableCell>
          <TableCell className="text-right font-mono">{Number(rule.minimumFare).toLocaleString()}</TableCell>
          <TableCell className="text-right font-mono">{Number(rule.commissionPercent)}%</TableCell>
        </>
      )}
      <TableCell>{rule.currency}</TableCell>
      <TableCell>
        <button
          onClick={handleToggleActive}
          className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: rule.isActive ? "#10b98120" : "#9ca3af20", color: rule.isActive ? "#059669" : "#6b7280" }}
        >
          {rule.isActive ? "Active" : "Inactive"}
        </button>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {editing ? (
            <>
              <Button size="sm" variant="outline" disabled={update.isPending} onClick={handleSave}><Check className="h-4 w-4 text-green-600" /></Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Edit className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" disabled={remove.isPending} onClick={handleDelete}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function PricingSettingsTab() {
  const { data, isLoading, refetch } = usePricingSettings();
  const create = useCreatePricingRule();
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<PricingRuleInput>(emptyDraft);

  async function handleCreate() {
    try {
      await create.mutateAsync(draft);
      setShowNew(false);
      setDraft(emptyDraft);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create rule.";
      window.alert(msg);
    }
  }

  const rules = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Pricing settings
          </CardTitle>
          <CardDescription>
            Fare formula and commission percentage per vehicle category × ride type. Used to suggest a fare to passengers when they request a ride, and to debit the driver's wallet on ride completion.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add rule
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showNew && (
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col text-xs gap-1">
                  <span className="text-muted-foreground">Category</span>
                  <Select value={draft.vehicleCategory} onValueChange={(v) => setDraft({ ...draft, vehicleCategory: v as VehicleCategory })}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </label>
                <label className="flex flex-col text-xs gap-1">
                  <span className="text-muted-foreground">Ride type</span>
                  <Select value={draft.rideType} onValueChange={(v) => setDraft({ ...draft, rideType: v as RideType })}>
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{RIDE_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </label>
                <NumberField label="Base fare" value={draft.baseFare} onChange={(v) => setDraft({ ...draft, baseFare: v })} />
                <NumberField label="Per km" value={draft.perKm} onChange={(v) => setDraft({ ...draft, perKm: v })} />
                <NumberField label="Per minute" value={draft.perMinute} onChange={(v) => setDraft({ ...draft, perMinute: v })} />
                <NumberField label="Minimum fare" value={draft.minimumFare} onChange={(v) => setDraft({ ...draft, minimumFare: v })} />
                <NumberField label="Commission %" value={draft.commissionPercent} onChange={(v) => setDraft({ ...draft, commissionPercent: v })} step={0.5} />
                <label className="flex flex-col text-xs gap-1">
                  <span className="text-muted-foreground">Currency</span>
                  <Input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase().slice(0, 3) })} className="w-20" />
                </label>
                <div className="flex gap-2">
                  <Button size="sm" disabled={create.isPending} onClick={handleCreate}>Create</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <TableSkeleton />
        ) : rules.length === 0 ? (
          <EmptyState icon={DollarSign} title="No pricing rules" description="Add a rule to start suggesting fares to passengers." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Per km</TableHead>
                <TableHead className="text-right">Per min</TableHead>
                <TableHead className="text-right">Min</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Ccy</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r) => (
                <RuleRow key={r.id} rule={r} onSaved={() => refetch()} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
