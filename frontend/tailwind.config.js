/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        night: "#08070d",
        surface: "#11101a",
        neonPink: "#ff1478",
        neonGreen: "#17f56b",
        neonYellow: "#ffd21f",
        neonOrange: "#ff8a1f",
      },
      boxShadow: {
        neon: "0 0 28px rgba(255, 20, 120, 0.22)",
      },
    },
  },
  plugins: [],
};
