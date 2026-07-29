import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Smartphone, MapPin, CreditCard, Cloud } from "lucide-react";

export const MobileApp = () => {
  const features = [
    {
      title: "Book on the Go",
      description: "Find and book rides instantly from anywhere, anytime with our mobile app.",
      icon: Smartphone,
    },
    {
      title: "Real-Time Tracking",
      description: "Track your ride in real-time and stay connected with your driver throughout the journey.",
      icon: MapPin,
    },
    {
      title: "Easy Payments",
      description: "Pay securely with multiple payment methods. Fast, safe, and hassle-free transactions.",
      icon: CreditCard,
    },
    {
      title: "Weather Updates",
      description: "Get weather alerts and road condition updates to plan your trip better.",
      icon: Cloud,
    },
  ];

  return (
    <section className="relative bg-gradient-to-b from-white to-green-50 py-24 px-4 overflow-hidden">
      <div className="container mx-auto relative z-10 max-w-7xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-7xl font-black text-black mb-6 leading-none">
            Take YourDrive With You
          </h2>
          <div className="w-24 h-1 bg-green-600 mx-auto mb-8"></div>
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Download our mobile app and experience seamless ridesharing wherever you go. Available on iOS and Android.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white border-2 border-gray-200 hover:border-green-500 hover:shadow-xl transition-all duration-300 p-8 group"
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-100 flex items-center justify-center group-hover:bg-green-600 transition-colors">
                    <Icon className="h-8 w-8 text-green-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
                <h3 className="font-bold text-black text-xl mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto"
        >
          <motion.button
            className="group relative bg-green-600 text-white px-8 py-4 flex items-center justify-center font-bold text-lg hover:bg-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toast.success("App coming soon!")}
          >
            <div className="relative flex items-center">
              <svg
                className="h-6 w-6 mr-3"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              App Store
            </div>
          </motion.button>

          <motion.button
            className="group relative bg-white border-2 border-green-600 text-green-600 px-8 py-4 flex items-center justify-center font-bold text-lg hover:bg-green-50 transition-all duration-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toast.success("App coming soon!")}
          >
            <div className="relative flex items-center">
              <svg
                className="h-6 w-6 mr-3"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              Google Play
            </div>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};
