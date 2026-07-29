import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReactItems } from "@/lib/ReactTranslation";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { Button } from "../ui/button";

export const MessageDialog = ({
  showMessage,
  setShowMessage,
  setCompleteDriver,
  userPreference,
  resetFormStates,
}: {
  showMessage: boolean;
  setShowMessage: React.Dispatch<React.SetStateAction<boolean>>;
  setCompleteDriver: React.Dispatch<React.SetStateAction<boolean>>;
  userPreference: any;
  resetFormStates: () => void;
}) => {
  const { t } = useReactItems();

  return (
    <Dialog open={showMessage}>
      <AnimatePresence>
        {showMessage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <DialogOverlay className="bg-black/30 backdrop-blur-sm" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <DialogContent
                className="max-w-md rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
              >
                <div className="space-y-4">
                  <DialogHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary-100 dark:bg-primary-900/30">
                        <AlertTriangle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
                        {t(
                          "ride.create.requirements.title",
                          "Complete Required Steps"
                        )}
                      </DialogTitle>
                    </div>
                    <DialogDescription className="text-gray-600 dark:text-gray-400 pt-2">
                      {t(
                        "ride.create.requirements.message",
                        "To create a ride, you must complete your driver onboarding and verify your phone number."
                      )}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3">
                    {/* ✅ Phone Verification Step */}
                    <div
                      className={clsx(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        userPreference.driver?.isPhoneVerified
                          ? "bg-green-50 border-green-500 dark:bg-green-900 dark:border-green-500"
                          : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-700"
                      )}
                    >
                      {userPreference.driver?.isPhoneVerified ? (
                        <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 mt-0.5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {t(
                            "ride.create.requirements.steps.phone",
                            "Phone Verification"
                          )}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t(
                            "ride.create.requirements.steps.phone_desc",
                            "Verify your mobile number for security"
                          )}
                        </p>
                      </div>
                    </div>

                    {/* ✅ Driver Onboarding Step */}
                    <div
                      className={clsx(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        userPreference.driver?.licenseImage?.url
                          ? "bg-green-50 border-green-500 dark:bg-green-900 dark:border-green-500"
                          : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-700"
                      )}
                    >
                      {userPreference.driver?.licenseImage?.url ? (
                        <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 mt-0.5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {t(
                            "ride.create.requirements.steps.onboarding",
                            "Driver Onboarding"
                          )}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t(
                            "ride.create.requirements.steps.onboarding_desc",
                            "Complete your profile and documents"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-4 gap-2 sm:gap-0">
                    <Button
                      onClick={() => {
                        resetFormStates();
                        setShowMessage(false);
                        window.history.back();
                      }}
                      variant="outline"
                      className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-500 dark:hover:bg-gray-700 dark:bg-gray-800"
                    >
                      {t("ride.create.requirements.back", "Go Back")}
                    </Button>

                    <Button
                      onClick={() => {
                        setShowMessage(false);
                        setTimeout(() => {
                          setCompleteDriver(true);
                        }, 500);
                      }}
                      className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      {t(
                        "ride.create.requirements.proceed",
                        "Start Onboarding"
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Dialog>
  );
};
