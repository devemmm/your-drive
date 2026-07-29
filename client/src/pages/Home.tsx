import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Welcome } from "@/components/sections/Welcome";
import { RideForm } from "@/components/sections/RideForm";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Testimonials } from "@/components/sections/Testimonials";
import { MobileApp } from "@/components/sections/MobileApp";
import { Benefits } from "@/components/sections/Benefits";
import { InviteFriends } from "@/components/sections/InviteFriends";

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col relative bg-white text-black">
      <Welcome />
      <RideForm />
      <HowItWorks />
      <Benefits />
      <Testimonials />
      <MobileApp />
      <InviteFriends />

      <section className="bg-gradient-to-br from-green-600 to-green-700 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20H0v-2h20zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of travelers and experience the future of ridesharing today
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/login"
                className="bg-white text-green-600 px-8 py-4 font-bold hover:bg-gray-100 transition-colors flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                Sign In
              </Link>
              <Link
                to="/book-a-ride"
                className="bg-transparent border-2 border-white text-white px-8 py-4 font-bold hover:bg-white hover:text-green-600 transition-colors flex items-center justify-center"
              >
                Find a Ride
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
