import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#1b1b1a",
        surface: "#242423",
        surface2: "#2d2d2c",
        border: "#3a3a38",
        muted: "#a3a29e",
        accent: "#7f9cf5",
      },
    },
  },
  plugins: [],
};

export default config;
