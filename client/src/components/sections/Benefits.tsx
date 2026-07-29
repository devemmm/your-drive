import { motion } from "framer-motion";

export const Benefits = () => {
  const benefits = [
    {
      title: "Save Money",
      description: "Share the cost of travel with other passengers. Pay significantly less than traditional transportation options.",
    },
    {
      title: "Travel Conveniently",
      description: "Choose from flexible departure times and routes that match your schedule. No more waiting for fixed schedules.",
    },
    {
      title: "Eco-Friendly Choice",
      description: "Reduce your carbon footprint by sharing rides. Fewer cars on the road means a cleaner environment for everyone.",
    },
    {
      title: "Meet New People",
      description: "Connect with fellow travelers and build meaningful connections while you journey together.",
    },
  ];

  return (
    <section className="py-24 bg-white text-black relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-7xl font-black text-black leading-none">
              Benefits That Matter
            </h2>
            <div className="w-24 h-1 bg-green-600"></div>
            <p className="text-xl text-gray-600 leading-relaxed">
              Join a community of smart travelers who choose convenience, savings, and sustainability.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 gap-6"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl font-black text-green-600 mb-2">
                50K+
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Active Users
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl font-black text-green-600 mb-2">
                12.5K+
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Rides Completed
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl font-black text-green-600 mb-2">
                98%
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Satisfaction Rate
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl font-black text-green-600 mb-2">
                24/7
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Support Available
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group bg-white border-2 border-gray-200 hover:border-green-500 hover:shadow-xl transition-all duration-300 p-8"
            >
              <img
                src={index === 0
                  ? "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop&q=80&ixlib=rb-4.1.0"
                  : index === 1
                  ? "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80&ixlib=rb-4.1.0"
                  : index === 2
                  ? "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80&ixlib=rb-4.1.0"
                  : "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&auto=format&fit=crop&q=80&ixlib=rb-4.1.0"
                }
                alt={benefit.title}
                className="w-full h-40 object-cover mb-4 border-2 border-gray-200 rounded-lg"
              />
              <h3 className="text-2xl font-bold mb-4 text-black">
                {benefit.title}
              </h3>
              <p className="leading-relaxed text-lg text-gray-600">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
