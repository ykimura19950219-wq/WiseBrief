import type { Config } from "tailwindcss";

const config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 22px rgba(168, 85, 247, 0.28)"
      }
    }
  },
  plugins: []
} satisfies Config;

export default config;

