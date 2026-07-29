import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { toast } from "sonner";

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ContactMessagesResponse {
  data: ContactMessage[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const useAdminContactMessages = (
  page: number = 1,
  pageSize: number = 10
) => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<ContactMessagesResponse>(
    {
      queryKey: ["admin-contact-messages", page, pageSize],
      queryFn: async () => {
        return api.get<ContactMessagesResponse>(
          `/api/v1/admin/contact-messages?page=${page}&pageSize=${pageSize}`
        );
      },
    }
  );

  const getContactMessage = useQuery<ContactMessage>({
    queryKey: ["admin-contact-message"],
    queryFn: async ({ queryKey }) => {
      const [_, messageId] = queryKey;
      return api.get<ContactMessage>(
        `/api/v1/admin/contact-messages/${messageId}`
      );
    },
    enabled: false,
  });

  const deleteContactMessage = useMutation({
    mutationFn: async (messageId: number) => {
      return api.delete<{ success: boolean; message: string }>(
        `/api/v1/admin/contact-messages/${messageId}`
      );
    },
    onSuccess: () => {
      toast.success("Contact message deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to delete contact message",
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (messageId: number) => {
      return api.patch<{ success: boolean; message: string }>(
        `/api/v1/admin/contact-messages/${messageId}/read`
      );
    },
    onSuccess: () => {
      toast.success("Message marked as read");
      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to mark message as read",
        {
          className: "custom-error-toast",
        }
      );
    },
  });

  return {
    contactMessages: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
    getContactMessage: getContactMessage.data,
    getContactMessageLoading: getContactMessage.isLoading,
    fetchContactMessage: getContactMessage.refetch,
    deleteContactMessage: deleteContactMessage.mutate,
    isDeleting: deleteContactMessage.isPending,
    markAsRead: markAsRead.mutate,
    isMarkingAsRead: markAsRead.isPending,
  };
};
