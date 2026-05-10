import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          dark: "#0A0A0A",
          light: "#FFFFFF",
        },
        surface: {
          dark: "#141414",
          "dark-2": "#1A1A1A",
          light: "#F5F5F5",
        },
        border: {
          dark: "#262626",
          light: "#E5E5E5",
        },
        accent: {
          dark: "#D4D4D4",
          light: "#404040",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
