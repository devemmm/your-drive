import { Star } from "lucide-react";
import { motion } from "framer-motion";

export const Testimonials = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      location: "Toronto, ON",
      role: "Frequent Traveler",
      quote: "YourDrive has completely changed how I travel. I save money, meet amazing people, and reduce my carbon footprint. Best decision ever!",
      route: "Toronto → Montreal",
    },
    {
      name: "Michael Chen",
      location: "Vancouver, BC",
      role: "Business Professional",
      quote: "The convenience and reliability of YourDrive is unmatched. I use it weekly for business trips and it's always been smooth and professional.",
      route: "Vancouver → Calgary",
    },
    {
      name: "Emily Rodriguez",
      location: "Montreal, QC",
      role: "Student",
      quote: "As a student, YourDrive helps me travel affordably between cities. The drivers are friendly and the platform is so easy to use.",
      route: "Montreal → Ottawa",
    },
  ];

  const testimonialImages = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80&ixlib=rb-4.1.0",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80&ixlib=rb-4.1.0",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop&q=80&ixlib=rb-4.1.0",
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-green-50 to-white text-black relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl relative z-10">
        <motion.div
          className="mb-20 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-7xl font-black text-black mb-6 leading-none">
            What Our Users Say
          </h2>
          <div className="w-24 h-1 bg-green-600 mx-auto mb-8"></div>
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Real stories from real travelers who trust YourDrive for their journeys
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white border-2 border-gray-200 hover:border-green-500 hover:shadow-xl transition-all duration-300 p-8"
            >
                <div className="flex mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

              <p className="text-gray-700 text-base leading-relaxed mb-8">
                  "{testimonial.quote}"
                </p>

              <div className="border-t-2 border-gray-100 pt-6">
                  <div className="flex items-center gap-4">
                      <img
                    src={testimonialImages[index % testimonialImages.length]}
                        alt={testimonial.name}
                    className="w-12 h-12 object-cover border-2 border-green-200"
                      />
                    <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-black text-base mb-1 truncate">
                        {testimonial.name}
                      </h4>
                    <p className="text-sm text-gray-600 mb-1 truncate">
                        {testimonial.role} • {testimonial.location}
                      </p>
                    <p className="text-xs text-green-600 font-bold truncate">
                        {testimonial.route}
                      </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="bg-white p-12 border-2 border-gray-200"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-6xl font-black text-green-600 mb-3">
                50K+
              </div>
              <div className="text-lg text-gray-600 font-medium">
                Happy Travelers
              </div>
            </div>
            <div className="text-center">
              <div className="text-6xl font-black text-green-600 mb-3">98%</div>
              <div className="text-lg text-gray-600 font-medium">
                Satisfaction Rate
              </div>
            </div>
            <div className="text-center">
              <div className="text-6xl font-black text-green-600 mb-3">12.5K+</div>
              <div className="text-lg text-gray-600 font-medium">
                Successful Rides
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
