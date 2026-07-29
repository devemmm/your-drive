import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const Welcome = () => {
  return (
    <section className="relative bg-gradient-to-br from-white via-green-50 to-white min-h-[90vh] flex items-center overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-50/30 to-transparent"></div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight">
                  Your Complete
                  <br />
                  <span className="text-green-600">Mobility</span>
                  <br />
                  <span className="text-black">Super-App</span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-700 leading-relaxed max-w-xl">
                  From door to destination. One platform for rides, carpooling, payments, delivery, and vehicle rental.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  to="/book-a-ride"
                  className="group bg-green-600 text-white px-8 py-4 font-bold text-lg hover:bg-green-700 transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl"
                >
                  Book a Ride
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </Link>
                <Link
                  to="/post-a-ride"
                  className="group bg-white border-2 border-green-600 text-green-600 px-8 py-4 font-bold text-lg hover:bg-green-50 transition-all duration-200 flex items-center justify-center"
                >
                  Post a Ride
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </Link>
              </div>

              
            </motion.div>

            {/* Right Content - Car Image */}
            <motion.div
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative w-full h-[500px] lg:h-[600px]">
                <img
                  src="https://plus.unsplash.com/premium_vector-1733925523283-d3b9b5f64c55?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjN8fGNhcnxlbnwwfHwwfHx8MA%3D%3D"
                  alt="Modern car"
                  className="w-full h-full object-cover"
                />
               
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
