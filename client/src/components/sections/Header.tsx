import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle: string;
  backgroundImage?: string;
  overlay?: boolean; // Optional overlay prop
  overlayOpacity?: number; // Optional opacity control
  overlayColor?: string; // Optional color control
}

const PageHeader = ({
  title,
  subtitle,
  backgroundImage,
  overlay = true, // Default to true for backwards compatibility
  overlayOpacity = 0.5,
  overlayColor = "black",
}: PageHeaderProps) => {
  return (
    <div className="relative min-h-[50vh] bg-background w-full overflow-hidden">
      {/* Background Image with overlay */}
      {backgroundImage && (
        <div className="absolute inset-0">
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${backgroundImage})`,
            }}
          />

          {/* Optional Overlay */}
          {overlay && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: overlayColor,
                opacity: overlayOpacity,
              }}
            />
          )}
        </div>
      )}

      {/* Geometric background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(currentColor 1px, transparent 1px),
                linear-gradient(90deg, currentColor 1px, transparent 1px)
              `,
              backgroundSize: "50px 50px",
            }}
          ></div>
        </div>
      </div>

      {/* Content container */}
      <div className="relative z-20 container mx-auto h-full flex flex-col justify-center items-center px-4 py-24">
        {/* Main content */}
        <motion.div
          className="text-center max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Title with enhanced typography */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl md:text-7xl lg:text-8xl font-black text-foreground mb-8 leading-[0.9] tracking-tight"
          >
            <span className="relative inline-block text-white">
              {title}
              {/* Subtle accent line under title */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1, delay: 0.8 }}
                className="absolute -bottom-2 left-0 h-1 bg-primary rounded-full"
              ></motion.div>
            </span>
          </motion.h1>

          {/* Subtitle with better spacing */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl lg:text-3xl text-white max-w-4xl mx-auto leading-relaxed font-light"
          >
            {subtitle}
          </motion.p>
        </motion.div>

        {/* Enhanced decorative elements */}
        <motion.div
          className="absolute top-20 left-20 flex items-center gap-2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="w-3 h-3 bg-white rounded-full"></div>
          <div className="w-16 h-px bg-primary/30"></div>
        </motion.div>

        <motion.div
          className="absolute top-40 right-20 flex flex-col items-center gap-2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="w-px h-16 bg-white/30"></div>
          <div className="w-3 h-3 bg-primary rounded-full"></div>
        </motion.div>

        <motion.div
          className="absolute bottom-32 left-16 grid grid-cols-2 gap-2"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <div className="w-2 h-2 bg-white/40 rounded-sm"></div>
          <div className="w-2 h-2 bg-white/60 rounded-sm"></div>
          <div className="w-2 h-2 bg-white/60 rounded-sm"></div>
          <div className="w-2 h-2 bg-white rounded-sm"></div>
        </motion.div>
      </div>

      {/* Corner accent elements */}
      <div className="absolute top-0 left-0 w-32 h-32">
        <div className="absolute top-8 left-8 w-16 h-px bg-primary/20"></div>
        <div className="absolute top-8 left-8 w-px h-16 bg-primary/20"></div>
      </div>

      <div className="absolute top-0 right-0 w-32 h-32">
        <div className="absolute top-8 right-8 w-16 h-px bg-primary/20"></div>
        <div className="absolute top-8 right-8 w-px h-16 bg-primary/20"></div>
      </div>
    </div>
  );
};

export default PageHeader;
