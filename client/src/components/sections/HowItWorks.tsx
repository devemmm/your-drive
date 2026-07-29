import { motion } from "framer-motion";

export const HowItWorks = () => {
  const steps = [
    {
      title: "Enter Your Route",
      description: "Tell us where you're going. Enter your departure and destination cities to see available rides.",
      number: "01",
    },
    {
      title: "Choose Your Ride",
      description: "Browse through verified drivers and select a ride that fits your schedule and preferences.",
      number: "02",
    },
    {
      title: "Book & Travel",
      description: "Confirm your booking, connect with your driver, and enjoy a safe, comfortable journey.",
      number: "03",
    },
  ];

  const features = [
    {
      title: "Instant Booking",
      description: "Book your ride in seconds with our streamlined booking process.",
    },
    {
      title: "Secure Payments",
      description: "Pay safely through our platform with multiple payment options available.",
    },
    {
      title: "Verified Drivers",
      description: "All drivers are verified and rated by our community for your peace of mind.",
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-white to-green-50 text-black relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl relative z-10">
        <motion.div
          className="mb-20 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-7xl font-black text-black mb-6 leading-none">
            How It Works
          </h2>
          <div className="w-24 h-1 bg-green-600 mx-auto mb-8"></div>
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Getting started is simple. Follow these three easy steps to begin your journey.
          </p>
        </motion.div>

        {/* Steps Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white border-2 border-gray-200 p-8 hover:border-green-500 hover:shadow-xl transition-all duration-300 group"
            >
              <div className="mb-6">
                <img
                  src={index === 0 
                    ? "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80&ixlib=rb-4.1.0"
                    : index === 1
                    ? "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80&ixlib=rb-4.1.0"
                    : "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80&ixlib=rb-4.1.0"
                  }
                  alt={step.title}
                  className="w-full h-48 object-cover mb-4 border-2 border-gray-200 rounded-lg"
                />
                <div className="text-5xl font-black text-gray-200 group-hover:text-green-100 transition-colors">
                  {step.number}
                </div>
              </div>
              <h3 className="text-3xl font-black mb-4 text-black">
                {step.title}
              </h3>
              <p className="text-lg leading-relaxed text-gray-600">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Features Section */}
        <motion.div
          className="bg-white p-12 border-2 border-gray-200"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="border-l-4 border-green-600 pl-6 py-4"
              >
                <h4 className="font-bold text-2xl mb-3 text-black">
                  {feature.title}
                </h4>
                <p className="text-gray-600 text-lg">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
