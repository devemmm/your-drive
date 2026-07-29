import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

const Skeleton = ({ className, width, height }: SkeletonProps) => {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className
      )}
      style={{
        width: width || "100%",
        height: height || "1rem",
      }}
    />
  );
};

// Chat message skeleton
export const ChatMessageSkeleton = () => (
  <div className="flex gap-3 mb-4">
    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
    <div className="flex-1 space-y-2">
      <Skeleton width="60%" height="0.75rem" />
      <Skeleton width="80%" height="1rem" />
    </div>
  </div>
);

// Thread skeleton
export const ThreadSkeleton = () => (
  <div className="flex items-center gap-3 p-3">
    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
    <div className="flex-1 space-y-2">
      <Skeleton width="70%" height="0.875rem" />
      <Skeleton width="50%" height="0.75rem" />
    </div>
  </div>
);

export default Skeleton;
