import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Jost", ...fontFamily.sans],
        heading: ["Poppins", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#1A6373",
          foreground: "#FFFFFF",
          50: "#E6F0F2",
          100: "#CCDFE2",
          200: "#99BFC5",
          300: "#669FA9",
          400: "#337E8C",
          500: "#1A6373",
          600: "#154F5C",
          700: "#103B45",
          800: "#0A282E",
          900: "#051417",
        },
        secondary: {
          DEFAULT: "#4CAF50",
          foreground: "#FFFFFF",
          50: "#EAF5EA",
          100: "#D5EAD6",
          200: "#ABD6AD",
          300: "#81C184",
          400: "#57AD5B",
          500: "#4CAF50",
          600: "#3D8C40",
          700: "#2E6930",
          800: "#1E4620",
          900: "#0F2310",
        },
        accent: {
          DEFAULT: "#30BFDD",
          foreground: "#FFFFFF",
          50: "#E8F7FB",
          100: "#D1EEF7",
          200: "#A3DEEF",
          300: "#75CDE7",
          400: "#47BDDF",
          500: "#30BFDD",
          600: "#2699B1",
          700: "#1D7385",
          800: "#134C58",
          900: "#0A262C",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.5s ease-out",
        "spin-slow": "spin 2s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
