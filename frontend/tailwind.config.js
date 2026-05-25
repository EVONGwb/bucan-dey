/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        night: "#070B14",
        surface: "#0F172A",
        glass: "rgba(255,255,255,0.06)",
        liveRed: "#FF3040",
        neonCyan: "#00D9FF",
        fiestaPurple: "#7C3AED",
        neonPink: "#FF4FD8",
        neonGreen: "#17f56b",
        neonYellow: "#FFD84D",
        neonOrange: "#ff8a1f",
      },
      boxShadow: {
        neon: "0 0 28px rgba(255, 79, 216, 0.22)",
        cyan: "0 0 30px rgba(0, 217, 255, 0.24)",
        live: "0 0 26px rgba(255, 48, 64, 0.32)",
      },
    },
  },
  plugins: [],
};
