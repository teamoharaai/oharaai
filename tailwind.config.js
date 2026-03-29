/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: "#FAF9F6",
        "near-black": "#1A1A1A",
        "earth-green": "#2D6A4F",
        "earth-green-dark": "#1E4D38",
        amber: "#E09F3E",
        "card-bg": "#F3F1EC",
        muted: "#6B6B6B",
        // Dark theme (app screens)
        "dark-bg": "#0A0A0F",
        "dark-card": "#14141F",
        "dark-border": "#1E1E2E",
        ink: "#FAFAFA",
        "ink-dim": "#8888A0",
        primary: "#6E5CE7",
      },
      fontFamily: {
        sans: ["System", "sans-serif"],
      },
    },
  },
  plugins: [],
};
