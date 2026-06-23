import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#25D366", // WhatsApp green
          dark: "#128C7E", // teal
          darker: "#075E54", // deep teal (sidebar)
          light: "#DCF8C6", // chat bubble green
          50: "#effdf4",
          100: "#d7f9e3",
          600: "#16a34a",
          700: "#15803d",
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
