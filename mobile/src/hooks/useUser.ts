import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { ApiResponse, User } from "@/lib/types";
import { queryKeys } from "@/lib/constants";

export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: queryKeys.user.profile,
    queryFn: () => api.get<ApiResponse<User>>("/users/profile"),
    enabled,
    select: (data) => data.data,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: FormData) => api.upload("/users/update", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.user.profile }); },
  });
}

export function useAddPhone() {
  return useMutation({
    mutationFn: (phoneNumber: string) => api.post("/users/add-phone", { phoneNumber }),
  });
}

export function useVerifyPhone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { phoneNumber: string; code: string }) =>
      api.post("/users/verify-phone", input),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.user.profile }); },
  });
}

export function useToggleRideRequestAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isAvailableForRideRequest: boolean) =>
      api.patch("/users/ride-request-availability", { isAvailableForRideRequest }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
    },
  });
}
