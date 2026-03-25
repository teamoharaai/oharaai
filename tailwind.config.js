/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
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
      },
      fontFamily: {
        sans: ["System", "sans-serif"],
      },
    },
  },
  plugins: [],
};
