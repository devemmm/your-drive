import React from "react";

const Payment = () => {
  return (
    <div className="dark:bg-gray-900 w-full">
      <div className="max-w-2xl mx-auto px-4 lg:px-12 py-24 mt-20 text-center space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Payments
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          Payment processing for rides will appear here once it is activated.
          For now, booking confirmations and driver payouts continue to follow
          the existing ride workflow.
        </p>
      </div>
    </div>
  );
};

export default Payment;
