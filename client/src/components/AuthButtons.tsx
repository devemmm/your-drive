import { apiUrl } from "@/data";
import axios from "axios";

const AuthButtons = () => {
  const authFunction = (provider: "google" | "apple") => {
    window.location.href = `${apiUrl}/api/v1/auth/${provider}`;
  };

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 w-full">
      {/* Google Button */}
      <button
        type="button"
        onClick={() => authFunction("google")}
        className="w-full flex justify-center py-3 px-4 border rounded-xl shadow-sm text-base font-medium text-primary-700 border-primary-700 hover:text-white dark:text-white bg-white hover:bg-primary-700 dark:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path
            d="M22.5 12.273c0-.818-.074-1.598-.212-2.345H12v4.439h5.922a5.07 5.07 0 01-2.197 3.325v2.761h3.543c2.073-1.91 3.232-4.726 3.232-8.18z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.464-.984 7.285-2.668l-3.543-2.76c-.983.657-2.237 1.04-3.742 1.04-2.875 0-5.306-1.941-6.174-4.556H2.18v2.867A10.998 10.998 0 0012 23z"
            fill="#34A853"
          />
          <path
            d="M5.826 13.056A6.6 6.6 0 015.45 12c0-.367.066-.724.123-1.056V8.077H2.18A10.998 10.998 0 001.2 12c0 1.713.405 3.332 1.116 4.743l3.51-3.687z"
            fill="#FBBC05"
          />
          <path
            d="M12 4.543c1.62 0 3.074.56 4.22 1.658l3.152-3.152C17.464 1.2 14.97 0 12 0 7.272 0 3.173 3.154 2.18 7.346l3.646 2.867C6.694 7.131 9.125 4.543 12 4.543z"
            fill="#EA4335"
          />
        </svg>
        Google
      </button>

      {/* Apple Button */}
      <button
        type="button"
        onClick={() => authFunction("apple")}
        className="w-full flex justify-center py-3 px-4 border rounded-xl shadow-sm text-base font-medium text-primary-700 border-primary-700 hover:text-white dark:text-white bg-white hover:bg-primary-700 dark:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M16.365 1.43c0 1.14-.425 2.104-1.274 2.89-.886.818-1.86 1.29-2.915 1.29-.077-.992.32-1.948 1.17-2.867.85-.953 1.874-1.413 3.02-1.313zm5.513 17.285c-.254.588-.553 1.14-.895 1.658-.32.474-.662.918-1.027 1.33-.463.54-.889 1.015-1.28 1.42-.47.498-.972.748-1.51.748-.38 0-.84-.107-1.38-.32-.54-.215-1.045-.322-1.512-.322-.49 0-1.015.107-1.57.322-.56.213-.986.32-1.277.32-.538 0-1.056-.25-1.553-.75-.424-.415-.865-.895-1.32-1.44-.36-.44-.72-.91-1.078-1.41-.352-.498-.655-1.063-.905-1.693-.27-.664-.406-1.326-.406-1.985 0-1.172.27-2.21.81-3.113.54-.9 1.245-1.58 2.114-2.033.807-.41 1.6-.62 2.377-.63.463 0 1.063.13 1.805.394.74.262 1.22.394 1.434.394.154 0 .633-.15 1.44-.45.775-.287 1.423-.41 1.937-.37 1.43.117 2.516.698 3.26 1.747-1.29.783-1.935 1.88-1.935 3.295 0 .83.195 1.547.586 2.15.392.605.93 1.09 1.616 1.45z" />
        </svg>
        Apple
      </button>
    </div>
  );
};

export default AuthButtons;
