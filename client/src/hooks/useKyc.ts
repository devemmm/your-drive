import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

export type KycStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AssetFile {
  id?: number;
  url: string;
  category?: string;
}

export interface KycUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  isDriverOnboarded: boolean;
  licenseNumber: string | null;
  drivingExperience: string | null;
  kycStatus: KycStatus;
  kycReviewedAt: string | null;
  kycReviewNotes: string | null;
  createdAt: string;
  licenseImage: AssetFile | null;
  licenseImages: {
    frontImage: AssetFile | null;
    backImage: AssetFile | null;
  } | null;
  profileImage: AssetFile | null;
  kycReviewedBy: { id: number; firstName: string; lastName: string } | null;
}

export interface KycVehicle {
  id: number;
  make: string;
  model: string;
  year: number | null;
  color: string;
  plateNumber: string;
  category: string;
  capacity: number;
  kycStatus: KycStatus;
  kycReviewedAt: string | null;
  kycReviewNotes: string | null;
  createdAt: string;
  user: { id: number; firstName: string; lastName: string; email: string };
  files: AssetFile[];
  defaultImage: AssetFile | null;
}

interface Paginated<T> {
  status: boolean;
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

interface KycParams {
  page?: number;
  pageSize?: number;
  status?: KycStatus;
}

export function useKycUsers(params: KycParams) {
  return useQuery({
    queryKey: ["admin-kyc-users", params],
    queryFn: () => api.get<Paginated<KycUser>>("/api/v1/admin/kyc/users", { params }),
  });
}

export function useKycVehicles(params: KycParams) {
  return useQuery({
    queryKey: ["admin-kyc-vehicles", params],
    queryFn: () => api.get<Paginated<KycVehicle>>("/api/v1/admin/kyc/vehicles", { params }),
  });
}

export function useReviewKycUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reviewNotes }: { id: number; status: "APPROVED" | "REJECTED"; reviewNotes?: string }) =>
      api.patch(`/api/v1/admin/kyc/users/${id}`, { status, reviewNotes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-kyc-users"] }),
  });
}

export function useReviewKycVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reviewNotes }: { id: number; status: "APPROVED" | "REJECTED"; reviewNotes?: string }) =>
      api.patch(`/api/v1/admin/kyc/vehicles/${id}`, { status, reviewNotes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-kyc-vehicles"] }),
  });
}
