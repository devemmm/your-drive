const LoadingIndicator = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center space-y-6">
        {/* Loader core */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* White circle */}
          <div className="absolute inset-0 rounded-full bg-white dark:bg-gray-800 shadow-lg" />

          {/* Circular arc spinner */}
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

          {/* "your drive" text in the center */}
          <span className="relative z-10 text-primary font-bold text-lg tracking-tight">
            your drive
          </span>
        </div>
        <p className="text-xl font-bold text-primary-700 dark:text-primary-400 tracking-wide">
          Please Wait...
        </p>
      </div>
    </div>
  );
};

export default LoadingIndicator;
