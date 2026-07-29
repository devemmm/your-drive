import { cn } from "@/lib/utils";
import React from "react";

interface PaymentCardProps {
  className?: string;
}

const PaymentCard = ({ className }: PaymentCardProps) => {
  return (
    <svg
      viewBox="0 0 52.5 52.5"
      xmlns="http://www.w3.org/2000/svg"
      role="presentation"
      focusable="false"
      tabIndex={-1}
      className={cn("w-10", className)}
    >
      <path d="M40.3 14H12.2a3.45 3.45 0 00-3.45 3.45v14.1A3.45 3.45 0 0012.2 35h1.06A7 7 0 0027 35h13.3a3.45 3.45 0 003.45-3.45v-14.1A3.45 3.45 0 0040.3 14zM42 31.55a1.7 1.7 0 01-1.7 1.7H27.1a7.1 7.1 0 00-.23-1.48l-1.53 1.53v.33a5.25 5.25 0 11-5.25-5.25 5.2 5.2 0 013.29 1.19l1.26-1.26a7 7 0 00-11.53 4.94h-.91a1.7 1.7 0 01-1.7-1.7v-7.92H42zm0-13.18H10.5v-.93a1.7 1.7 0 011.7-1.7h28.1a1.7 1.7 0 011.7 1.7z"></path>
      <path d="M17.7 31.66l-1.24 1.24 3.85 3.84 8.62-8.62-1.23-1.24-7.39 7.39z"></path>
    </svg>
  );
};

export default PaymentCard;
