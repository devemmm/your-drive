import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // If it's a localStorage related error, clear storage and reload
    if (
      error.message.includes("JSON") ||
      error.message.includes("localStorage")
    ) {
      console.warn("Clearing corrupted localStorage data...");
      try {
        localStorage.removeItem("Your-DriveToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("theme");
      } catch (e) {
        console.error("Failed to clear localStorage:", e);
      }

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md mx-auto text-center">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Something went wrong
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  We're fixing the issue. The page will reload automatically.
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
