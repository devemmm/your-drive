import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";

interface DialogFunctionProps {
  toggle: boolean;
  setToggle: React.Dispatch<React.SetStateAction<boolean>>;
  title: string;
  description: string;
  cancel: () => void;
  accept: () => void;
  placeholder?: string;
  input?: boolean;
}

const DialogFunction: React.FC<DialogFunctionProps> = ({
  toggle,
  setToggle,
  title,
  description,
  cancel,
  accept,
  placeholder,
  input,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={toggle} onOpenChange={setToggle}>
      <DialogPortal>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              {title}
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {description}
            </DialogDescription>

            {input && (
              <div className="py-4 max-w-md space-y-2">
                <Label className="text-gray-900 dark:text-white">
                  {t("AdminDashboard.Verifications.dialogs.messageLabel")}
                </Label>
                <Textarea
                  placeholder={placeholder}
                  rows={4}
                  className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-primary-500 focus:border-primary-500 dark:focus:ring-primary-600 dark:focus:border-primary-600"
                />
              </div>
            )}
          </DialogHeader>
          <DialogFooter className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
            <DialogClose asChild>
              <Button
                variant="outline"
                onClick={cancel}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                onClick={accept}
                className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 text-white"
              >
                {t("common.confirm")}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default DialogFunction;
