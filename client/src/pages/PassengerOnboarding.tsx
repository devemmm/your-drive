import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/Context/UseAuthContext";
import PassengerOnboardingForm from "@/components/PassengerOnboardingForm";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Users, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const PassengerOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleOnboardingComplete = () => {
    // Redirect to passenger home page after successful onboarding
    navigate("/passenger-home", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{
            rotate: { duration: 20, repeat: Infinity, ease: "linear" },
            scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-purple-200/30 dark:from-blue-800/20 dark:to-purple-800/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            rotate: { duration: 25, repeat: Infinity, ease: "linear" },
            scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-blue-200/30 dark:from-purple-800/20 dark:to-blue-800/20 rounded-full blur-3xl"
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 pt-8 pb-4"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profile
            </Button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Passenger Setup
              </span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 }}
              className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-8"
            >
              <Star className="h-12 w-12 text-white" />
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              Welcome to YourDrive!
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Let's set up your passenger profile to help you find the perfect
              rides. This will only take a few minutes and will make your
              ride-sharing experience much better.
            </p>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="grid md:grid-cols-3 gap-6 mb-12"
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Personalized Matches
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Set your preferences to find rides that match your comfort and
                style perfectly.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Safe & Secure
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your information is protected and only used to enhance your ride
                experience.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Better Experience
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Get personalized notifications and recommendations for your
                favorite routes.
              </p>
            </motion.div>
          </motion.div>

          {/* Form Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
          >
            <PassengerOnboardingForm onComplete={handleOnboardingComplete} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PassengerOnboarding;
