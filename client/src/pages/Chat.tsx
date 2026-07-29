import React from "react";
import { useTranslation } from "react-i18next";
import ChatLayout from "@/components/Chat/ChatLayout";

const Chat: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("chat.messages")}</h1>
        <p className="text-muted-foreground">{t("chat.messagesDesc")}</p>
      </div>

      <ChatLayout />
    </div>
  );
};

export default Chat;
