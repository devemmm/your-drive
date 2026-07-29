import React from "react";
import { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) => {
  const { t } = useTranslation();

  return (
    <Card className={`dark:bg-gray-900 ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-4">
        {Icon && (
          <div className="mb-4 p-4 rounded-full bg-muted dark:bg-gray-800">
            <Icon className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title || t("common.emptyState.title", "No items found")}
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
          {description ||
            t(
              "common.emptyState.description",
              "There are no items to display at this time."
            )}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
};

export default EmptyState;
