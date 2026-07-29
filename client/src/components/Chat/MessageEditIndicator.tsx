import React from "react";
import { Edit } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageEditIndicatorProps {
  isEdited: boolean;
  className?: string;
}

const MessageEditIndicator: React.FC<MessageEditIndicatorProps> = ({
  isEdited,
  className,
}) => {
  if (!isEdited) return null;

  return (
    <div
      className={cn("flex items-center gap-1 text-xs opacity-70", className)}
    >
      <Edit className="h-3 w-3" />
      <span>edited</span>
    </div>
  );
};

export default MessageEditIndicator;
