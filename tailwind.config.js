/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "font-bold",
    "font-medium",
    "text-lg",
  ],
  theme: {
    extend: {
      colors: {
        hd: {
          accent: "#e963d4",
          "accent-hover": "#f080e0",
          deep: "#07050f",
          mid: "#120c1f",
          surface: "rgba(20, 16, 36, 0.82)",
          muted: "rgba(245, 242, 252, 0.58)",
        },
      },
      fontFamily: {
        sans: ["var(--font-hd-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        hd: "0 24px 48px -16px rgba(0, 0, 0, 0.55)",
        "hd-soft": "0 8px 32px rgba(0, 0, 0, 0.25)",
      },
      borderRadius: {
        hd: "14px",
        "hd-lg": "20px",
      },
    },
  },
  plugins: [],
};
