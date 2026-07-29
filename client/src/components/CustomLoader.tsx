import { cn } from "@/lib/utils";

interface CustomLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const CustomLoader = ({
  className,
  size = "md",
  showText = true,
}: CustomLoaderProps) => {
  const sizeClasses = {
    sm: "size-8",
    md: "size-12",
    lg: "size-16",
    xl: "size-20",
  };

  const textSizeClasses = {
    sm: "text-[6px]",
    md: "text-[8px]",
    lg: "text-[10px]",
    xl: "text-xs",
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        sizeClasses[size],
        className
      )}
    >
      {/* Background circle */}
      <div className="absolute inset-0 rounded-full bg-white dark:bg-gray-800 shadow-sm" />

      {/* Spinning arc */}
      <svg
        className="absolute inset-0 w-full h-full animate-spin"
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ zIndex: 2 }}
      >
        <circle
          cx="128"
          cy="128"
          r="110"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className="text-primary"
          strokeDasharray="180 520"
          strokeDashoffset="0"
        />
      </svg>

      {/* "your drive" text in center */}
      {showText && (
        <span
          className={cn(
            "relative z-10 text-primary font-bold tracking-tight",
            textSizeClasses[size]
          )}
        >
          your drive
        </span>
      )}
    </div>
  );
};

export default CustomLoader;
