import { progressVariants } from "@/utils/ride";
import { AnimatePresence, motion } from "framer-motion";

const ProgressStep = ({ step, currentStep, icon, label, onClick }) => (
  <motion.div
    className={`flex flex-col items-center cursor-pointer ${
      step >= currentStep
        ? "text-green-600 dark:text-green-500"
        : "text-gray-400 dark:text-gray-500"
    }`}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    }}
  >
    <motion.div
      className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
        step >= currentStep
          ? "bg-green-600 dark:bg-green-600 text-white shadow-lg"
          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
      } ${
        step === currentStep
          ? "ring-2 ring-green-600 ring-offset-2 dark:ring-offset-gray-800"
          : ""
      }`}
      animate={step >= currentStep ? "animate" : {}}
      variants={progressVariants}
      whileHover={{
        scale: 1.1,
        boxShadow:
          step >= currentStep ? "0 0 20px rgba(22, 163, 74, 0.4)" : "none",
      }}
    >
      {icon}
    </motion.div>
    <motion.span
      className="text-[10px] mt-1 text-center text-nowrap font-medium"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      {label}
    </motion.span>
  </motion.div>
);

export default ProgressStep;
