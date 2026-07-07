import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        "brand-dark": "#00272c",
        "brand-neon": "#e1ff51",
        "bg-light": "#ffffff",
        "bg-offwhite": "#ffffef",
      },
      fontFamily: {
        sans: ["Neue Montreal", "Inter", "Syne", "system-ui", "sans-serif"],
      },
    },
  },
};

export default config;
