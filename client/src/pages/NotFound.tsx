import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/providers/ThemeProvider";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const location = useLocation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto px-6 animate-fade-in">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-8xl md:text-9xl font-bold text-primary dark:text-white animate-slide-in">
            404
          </h1>
        </div>

        {/* Error message */}
        <div className="mb-8 space-y-4">
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground animate-slide-in">
            {t("notFound.title")}
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto animate-slide-in">
            {t("notFound.description")}
          </p>
        </div>

        {/* Error details for debugging */}
        <div className="mb-8 p-4 bg-muted/50 rounded-lg border border-border animate-slide-in">
          <p className="text-sm text-muted-foreground font-mono">
            {t("notFound.path")}:{" "}
            <span className="text-foreground">{location.pathname}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-in">
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            {t("notFound.goBack")}
          </Button>

          <Button
            onClick={() => (window.location.href = "/")}
            size="lg"
            className="w-full sm:w-auto"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {t("notFound.goHome")}
          </Button>
        </div>

        {/* Additional help */}
        <div className="mt-8 text-sm text-muted-foreground animate-slide-in">
          <p>{t("notFound.helpText")}</p>
        </div>
      </div>

      {/* Floating elements for visual interest */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-primary rounded-full animate-bounce"></div>
      <div className="absolute top-40 right-32 w-3 h-3 bg-accent rounded-full animate-bounce delay-300"></div>
      <div className="absolute bottom-32 left-32 w-2 h-2 bg-secondary rounded-full animate-bounce delay-500"></div>
      <div className="absolute bottom-20 right-20 w-3 h-3 bg-primary rounded-full animate-bounce delay-700"></div>
    </div>
  );
};

export default NotFound;
