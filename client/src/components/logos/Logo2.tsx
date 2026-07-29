import React from "react";

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "h-12 w-12" }) => {
  return (
    <img src="/logo/sterring.webp" alt="YourDrive Logo" className={className} />
  );
};

export default Logo;
