import { api } from "./api";

export interface ChatMessage {
  id: number;
  content: string;
  threadId: number;
  senderId: number;
  createdAt: string;
  updatedAt: string;
  sender: {
    id: number;
    name: string;
    email: string;
    gender?: string;
    roles: string[];
    isVerified: boolean;
    profileImage?: {
      url: string;
    };
  };
  readBy?: MessageRead[];
}

export interface MessageRead {
  id: number;
  messageId: number;
  userId: number;
  readAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    profileImage?: {
      url: string;
    };
  };
}

export interface ChatThread {
  id: number;
  rideId?: number;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  lastMessage?: ChatMessage;
  users: {
    id: number;
    name: string;
    email: string;
    profileImage?: {
      url: string;
    };
  }[];
  ride?: {
    id: number;
    departureLocation: {
      city: string;
      region: string;
    };
    destinationLocation: {
      city: string;
      region: string;
    };
    departureTime: string;
  };
}

export interface ChatThreadsResponse {
  success: boolean;
  data: ChatThread[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ChatMessagesResponse {
  success: boolean;
  data: ChatMessage[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SendMessageResponse {
  success: boolean;
  message: string;
  data: ChatMessage;
}

export interface MarkAsReadResponse {
  success: boolean;
  message: string;
  data: {
    messageId: number;
    readBy: MessageRead[];
  };
}

export interface GetReadStatusResponse {
  success: boolean;
  data: MessageRead[];
}

export class ChatService {
  // Get all chat threads for the current user
  static async getChatThreads(
    page: number = 1,
    pageSize: number = 10,
    sortBy: string = "updatedAt",
    order: "asc" | "desc" = "desc"
  ): Promise<ChatThreadsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sortBy,
      order,
    });

    return api.get<ChatThreadsResponse>(`/api/v1/chat/threads?${params}`);
  }

  // Get ride group chat messages for a specific thread
  static async getThreadMessages(
    threadId: number,
    page: number = 1,
    pageSize: number = 50,
    sortBy: string = "createdAt",
    order: "asc" | "desc" = "asc"
  ): Promise<ChatMessagesResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sortBy,
      order,
    });

    return api.get<ChatMessagesResponse>(
      `/api/v1/chat/threads/${threadId}/messages?${params}`
    );
  }

  // Send a message to a thread
  static async sendMessage(
    threadId: number,
    content: string
  ): Promise<SendMessageResponse> {
    return api.post<SendMessageResponse>(
      `/api/v1/chat/threads/${threadId}/messages`,
      {
        content,
      }
    );
  }

  // Update a message
  static async updateMessage(
    threadId: number,
    messageId: number,
    content: string
  ): Promise<SendMessageResponse> {
    return api.put<SendMessageResponse>(
      `/api/v1/chat/threads/${threadId}/messages/${messageId}`,
      {
        content,
      }
    );
  }

  // Delete a message
  static async deleteMessage(
    threadId: number,
    messageId: number
  ): Promise<{ success: boolean; message: string }> {
    return api.delete<{ success: boolean; message: string }>(
      `/api/v1/chat/threads/${threadId}/messages/${messageId}`
    );
  }

  // Join a chat thread
  static async joinThread(
    threadId: number
  ): Promise<{ success: boolean; message: string }> {
    return api.post<{ success: boolean; message: string }>(
      `/api/v1/chat/threads/${threadId}/join`
    );
  }

  // Get or create chat thread for a ride
  static async getOrCreateRideThread(
    rideId: number
  ): Promise<{ success: boolean; data: ChatThread }> {
    return api.post<{ success: boolean; data: ChatThread }>(
      `/api/v1/chat/threads/ride/${rideId}`
    );
  }

  // Mark messages as read
  static async markMessagesAsRead(
    threadId: number,
    messageIds: number[]
  ): Promise<MarkAsReadResponse> {
    return api.post<MarkAsReadResponse>(
      `/api/v1/chat/threads/${threadId}/messages/read`,
      {
        messageIds,
      }
    );
  }

  // Mark a single message as read
  static async markMessageAsRead(
    threadId: number,
    messageId: number
  ): Promise<MarkAsReadResponse> {
    return api.post<MarkAsReadResponse>(
      `/api/v1/chat/threads/${threadId}/messages/${messageId}/read`
    );
  }

  // Get read status for messages
  static async getMessageReadStatus(
    threadId: number,
    messageIds: number[]
  ): Promise<GetReadStatusResponse> {
    const params = new URLSearchParams({
      messageIds: messageIds.join(","),
    });

    return api.get<GetReadStatusResponse>(
      `/api/v1/chat/threads/${threadId}/messages/read-status?${params}`
    );
  }

  // Get read status for a single message
  static async getSingleMessageReadStatus(
    threadId: number,
    messageId: number
  ): Promise<GetReadStatusResponse> {
    return api.get<GetReadStatusResponse>(
      `/api/v1/chat/threads/${threadId}/messages/${messageId}/read-status`
    );
  }
}

export default ChatService;
