import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e5e7eb",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#0a0a0a",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-serif)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        marquee: "marquee 30s linear infinite",
        "marquee-slow": "marquee 50s linear infinite",
        "fade-in": "fadeIn 0.6s ease-out both",
        "slide-up": "slideUp 0.6s ease-out both",
        "pulse-soft": "pulseSoft 3s ease-in-out infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-100%)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(to right, #0a0a0a 1px, transparent 1px), linear-gradient(to bottom, #0a0a0a 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-pattern": "48px 48px",
      },
    },
  },
  plugins: [],
};

export default config;
