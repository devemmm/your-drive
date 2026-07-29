import { useTheme } from "@/providers/ThemeProvider";
import React from "react";

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "h-12 w-12" }) => {
  const { theme } = useTheme();

  return (
    <img
      src={theme === "dark" ? "/logo/dark-key.jpeg" : "/logo/OIP.jpeg"}
      alt="YourDrive Logo"
      className={className}
    />
  );
};

export default Logo;
