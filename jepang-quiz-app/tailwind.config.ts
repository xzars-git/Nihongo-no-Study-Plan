import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0c0c0d",
        surface: "#141416",
        surface2: "#1c1c1f",
        border: "#2a2a2e",
        muted: "#93939c",
        fg: "#f4f4f5",
        accent: "#818cf8",
        "accent-fg": "#0c0c0d",
        success: "#34d399",
        danger: "#f87171",
      },
    },
  },
  plugins: [],
};

export default config;
