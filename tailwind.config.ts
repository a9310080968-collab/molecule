import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#050816",
        glass: "rgba(10, 18, 36, 0.72)",
        cyanGlow: "#24d7ff",
        violetGlow: "#8f5cff",
      },
      boxShadow: {
        glass: "0 18px 60px rgba(0, 0, 0, 0.34)",
        cyan: "0 0 30px rgba(36, 215, 255, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
