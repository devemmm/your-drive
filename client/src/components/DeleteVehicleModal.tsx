import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function DeleteVehicleModal({
  deleteMutation,
  isPendingDelete,
}: {
  deleteMutation: () => void;
  isPendingDelete: boolean;
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t("DriverDashboard.vehicles.delete.button")}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="dark:bg-gray-900 dark:text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("DriverDashboard.vehicles.delete.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("DriverDashboard.vehicles.delete.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>
            {t("DriverDashboard.vehicles.delete.cancel")}
          </AlertDialogCancel>

          <Button
            disabled={isPendingDelete}
            variant="destructive"
            onClick={() => deleteMutation()}
          >
            {isPendingDelete ? (
              t("DriverDashboard.vehicles.delete.deleting")
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("DriverDashboard.vehicles.delete.confirmButton")}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
