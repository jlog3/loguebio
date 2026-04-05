/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          950: "#030810",
          900: "#060d17",
          800: "#0a1525",
          700: "#0a1f35",
          600: "#0e2a47",
          500: "#1e3a5f",
        },
        cyan: {
          glow: "#00e5ff",
        },
        pink: {
          glow: "#ff6ec7",
        },
        green: {
          glow: "#7cff6b",
        },
        gold: {
          glow: "#ffb340",
        },
        purple: {
          glow: "#c792ea",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Fira Code'", "'SF Mono'", "monospace"],
      },
      animation: {
        "pulse-ring": "pulse-ring 1.5s ease-out infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.4" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
