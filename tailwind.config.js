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
        "near-black": "#1A1F1C",
        "earth-green": "#2D6A4F",
        "earth-green-dark": "#1E4D38",
        "card-bg": "#F3F1EC",
        muted: "#6B7B6E",
        "border-color-subtle": "#EAE7E0",
        // Dark theme (app screens)
        "dark-bg": "#0A0A0F",
        "dark-card": "#14141F",
        "dark-border": "#1E1E2E",
        ink: "#FAFAFA",
        "ink-dim": "#8888A0",
        primary: "#6E5CE7",
      },
      fontFamily: {
        sans: ['Inter-Regular', 'System', 'sans-serif'],
        medium: ['Inter-Medium', 'System', 'sans-serif'],
        semibold: ['Inter-SemiBold', 'System', 'sans-serif'],
        serif: ['Lora-Regular', 'Georgia', 'serif'],
        'serif-italic': ['Lora-Italic', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:    ['12px', { lineHeight: '16px' }],
        sm:    ['13px', { lineHeight: '18px' }],
        base:  ['15px', { lineHeight: '22px' }],
        lg:    ['17px', { lineHeight: '24px' }],
        xl:    ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
      },
    },
  },
  plugins: [],
};
