import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Edit, Trash2, Send, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChatMessage } from "@/services/chatService";

interface MessageActionsProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  onEdit: (messageId: number, content: string) => void;
  onDelete: (messageId: number) => void;
  isEditing?: boolean;
  isDeleting?: boolean;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  message,
  isOwnMessage,
  onEdit,
  onDelete,
  isEditing = false,
  isDeleting = false,
}) => {
  const { t } = useTranslation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim());
      setIsEditDialogOpen(false);
    }
  };

  const handleDelete = () => {
    onDelete(message.id);
    setIsDeleteDialogOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    }
  };

  if (!isOwnMessage) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setIsEditDialogOpen(true)}
            disabled={isEditing}
          >
            <Edit className="h-4 w-4 mr-2" />
            {t("chat.editMessage")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isDeleting}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("chat.deleteMessage")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("chat.editMessage")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t("chat.typeMessage")}
              className="min-h-[100px] resize-none"
              disabled={isEditing}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isEditing}
            >
              <X className="h-4 w-4 mr-2" />
              {t("general.cancel")}
            </Button>
            <Button
              onClick={handleEdit}
              disabled={
                !editContent.trim() ||
                editContent === message.content ||
                isEditing
              }
            >
              <Send className="h-4 w-4 mr-2" />
              {isEditing ? t("general.updating") : t("general.update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.deleteMessage")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.deleteMessageConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("general.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("general.deleting") : t("general.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MessageActions;
