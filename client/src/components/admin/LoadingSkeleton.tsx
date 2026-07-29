import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import Skeleton from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  rows?: number;
  showHeader?: boolean;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows = 5,
  showHeader = true,
  className = "",
}) => {
  return (
    <Card className={`dark:bg-gray-900 ${className}`}>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const TableSkeleton: React.FC<{
  columns?: number;
  rows?: number;
}> = ({ columns = 5, rows = 5 }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: columns }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LoadingSkeleton;
