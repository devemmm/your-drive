import { useState } from "react";
import { format } from "date-fns";
import { ShieldCheck, CheckCircle, XCircle, Car, IdCard } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/admin/EmptyState";
import { TableSkeleton } from "@/components/admin/LoadingSkeleton";
import {
  KycStatus,
  KycUser,
  KycVehicle,
  useKycUsers,
  useKycVehicles,
  useReviewKycUser,
  useReviewKycVehicle,
} from "@/hooks/useKyc";

function statusBadge(status: KycStatus) {
  if (status === "APPROVED") return <Badge variant="default">Approved</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function DocThumb({ url, label }: { url?: string | null; label: string }) {
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center w-24 h-24 border border-dashed rounded text-xs text-muted-foreground">
        {label}
        <span className="mt-1 italic">missing</span>
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block group">
      <img src={url} alt={label} className="w-24 h-24 object-cover rounded border group-hover:opacity-80" />
      <div className="text-[10px] text-center mt-1 text-muted-foreground">{label}</div>
    </a>
  );
}

function UserDocsRow({ user }: { user: KycUser }) {
  const front = user.licenseImages?.frontImage?.url ?? user.licenseImage?.url ?? null;
  const back = user.licenseImages?.backImage?.url ?? null;
  return (
    <div className="flex gap-3 flex-wrap">
      <DocThumb url={user.profileImage?.url} label="Selfie" />
      <DocThumb url={front} label="License (front)" />
      <DocThumb url={back} label="License (back)" />
    </div>
  );
}

function VehicleDocsRow({ vehicle }: { vehicle: KycVehicle }) {
  const findByCat = (cat: string) => vehicle.files.find((f) => (f as { category?: string }).category === cat)?.url;
  return (
    <div className="flex gap-3 flex-wrap">
      <DocThumb url={vehicle.defaultImage?.url ?? findByCat("VEHICLE_IMAGE")} label="Vehicle" />
      <DocThumb url={findByCat("YELLOW_CARD")} label="Yellow card" />
      <DocThumb url={findByCat("VEHICLE_INSURANCE")} label="Insurance" />
      <DocThumb url={findByCat("VEHICLE_AUTHORIZATION")} label="Authorization" />
    </div>
  );
}

function ReviewActions({
  current,
  onApprove,
  onReject,
  pending,
}: {
  current: KycStatus;
  onApprove: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  if (current !== "PENDING") return null;
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="default" disabled={pending} onClick={onApprove}>
        <CheckCircle className="h-4 w-4 mr-1 text-green-300" />
        Approve
      </Button>
      <Button size="sm" variant="destructive" disabled={pending} onClick={onReject}>
        <XCircle className="h-4 w-4 mr-1" />
        Reject
      </Button>
    </div>
  );
}

function UsersPanel({ status }: { status: KycStatus }) {
  const { data, isLoading } = useKycUsers({ status, pageSize: 50 });
  const review = useReviewKycUser();
  const users = data?.data ?? [];

  async function handle(id: number, status: "APPROVED" | "REJECTED") {
    const notes = window.prompt(
      status === "REJECTED"
        ? "Reason for rejection (shown to driver):"
        : "Optional approval note:"
    );
    if (status === "REJECTED" && !notes) return;
    await review.mutateAsync({ id, status, reviewNotes: notes ?? undefined });
  }

  if (isLoading) return <TableSkeleton />;
  if (users.length === 0) {
    return <EmptyState icon={IdCard} title="No drivers" description={`No drivers in ${status.toLowerCase()} state.`} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Driver</TableHead>
          <TableHead>License</TableHead>
          <TableHead>Docs</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell>
              <div className="font-medium">{u.firstName ?? "—"} {u.lastName ?? ""}</div>
              <div className="text-xs text-muted-foreground">{u.email}</div>
              <div className="text-xs text-muted-foreground">{u.phoneNumber ?? "—"}</div>
            </TableCell>
            <TableCell>
              <div className="font-mono text-xs">{u.licenseNumber ?? "—"}</div>
              {u.drivingExperience ? (
                <div className="text-xs text-muted-foreground mt-1">{u.drivingExperience}</div>
              ) : null}
            </TableCell>
            <TableCell>
              <UserDocsRow user={u} />
            </TableCell>
            <TableCell>
              {statusBadge(u.kycStatus)}
              {u.kycReviewedAt ? (
                <div className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(u.kycReviewedAt), "MMM dd HH:mm")}
                </div>
              ) : null}
              {u.kycReviewNotes ? (
                <div className="text-xs italic text-muted-foreground mt-1 max-w-xs">{u.kycReviewNotes}</div>
              ) : null}
            </TableCell>
            <TableCell className="text-right">
              <ReviewActions
                current={u.kycStatus}
                pending={review.isPending}
                onApprove={() => handle(u.id, "APPROVED")}
                onReject={() => handle(u.id, "REJECTED")}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function VehiclesPanel({ status }: { status: KycStatus }) {
  const { data, isLoading } = useKycVehicles({ status, pageSize: 50 });
  const review = useReviewKycVehicle();
  const vehicles = data?.data ?? [];

  async function handle(id: number, status: "APPROVED" | "REJECTED") {
    const notes = window.prompt(
      status === "REJECTED"
        ? "Reason for rejection (shown to driver):"
        : "Optional approval note:"
    );
    if (status === "REJECTED" && !notes) return;
    await review.mutateAsync({ id, status, reviewNotes: notes ?? undefined });
  }

  if (isLoading) return <TableSkeleton />;
  if (vehicles.length === 0) {
    return <EmptyState icon={Car} title="No vehicles" description={`No vehicles in ${status.toLowerCase()} state.`} />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vehicle</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Docs</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vehicles.map((v) => (
          <TableRow key={v.id}>
            <TableCell>
              <div className="font-medium">{v.year ?? "—"} {v.make} {v.model}</div>
              <div className="text-xs text-muted-foreground font-mono">{v.plateNumber}</div>
              <div className="text-xs text-muted-foreground">{v.category} · {v.capacity} seat{v.capacity > 1 ? "s" : ""} · {v.color}</div>
            </TableCell>
            <TableCell>
              <div>{v.user.firstName} {v.user.lastName}</div>
              <div className="text-xs text-muted-foreground">{v.user.email}</div>
            </TableCell>
            <TableCell>
              <VehicleDocsRow vehicle={v} />
            </TableCell>
            <TableCell>
              {statusBadge(v.kycStatus)}
              {v.kycReviewedAt ? (
                <div className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(v.kycReviewedAt), "MMM dd HH:mm")}
                </div>
              ) : null}
              {v.kycReviewNotes ? (
                <div className="text-xs italic text-muted-foreground mt-1 max-w-xs">{v.kycReviewNotes}</div>
              ) : null}
            </TableCell>
            <TableCell className="text-right">
              <ReviewActions
                current={v.kycStatus}
                pending={review.isPending}
                onApprove={() => handle(v.id, "APPROVED")}
                onReject={() => handle(v.id, "REJECTED")}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function KycReviewTab() {
  const [status, setStatus] = useState<KycStatus>("PENDING");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          KYC review
        </CardTitle>
        <CardDescription>
          Approve or reject driver documents and vehicle paperwork. Drivers can't go online and vehicles can't be used for rides until APPROVED.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter by status:</span>
          <Select value={status} onValueChange={(v) => setStatus(v as KycStatus)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Drivers</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="mt-4">
            <UsersPanel status={status} />
          </TabsContent>
          <TabsContent value="vehicles" className="mt-4">
            <VehiclesPanel status={status} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
