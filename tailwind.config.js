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
        "near-black": "#211F1A",
        "earth-green": "#2D6A4F",
        "earth-green-dark": "#1E4D38",
        "card-bg": "#F3F1EC",
        muted: "#8A8172",
        "border-color-subtle": "#EAE7E0",
        // Warm-neutral repalette (dashboard redesign — Session 1 tokens)
        "page-bg": "#F8F4EC",
        "ink-muted": "#A79E8E",
        "ink-on-dark": "#EDE7DA",
        "ink-muted-on-dark": "#9C9483",
        "emerald-deep": "#1E3226",
        "emerald-active": "#2A4436",
        "nav-inactive": "#8FA294",
        "teal-bright": "#6FDFB8",
        "teal-mid": "#2F8F6D",
        "teal-soft": "#9FD9C4",
        "goal-card": "#FCFAF4",
        "border-warm": "#EDE6D8",
        "border-warm-subtle": "#EFE9DC",
        "toggle-glyph": "#A8C4AE",
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
        'inter-medium': ['Inter-Medium', 'System', 'sans-serif'],
        'inter-semibold': ['Inter-SemiBold', 'System', 'sans-serif'],
        'inter-bold': ['Inter-Bold', 'System', 'sans-serif'],
        'inter-extrabold': ['Inter-ExtraBold', 'System', 'sans-serif'],
        serif: ['Lora-Regular', 'Georgia', 'serif'],
        'serif-italic': ['Lora-Italic', 'Georgia', 'serif'],
        'serif-italic-semibold': ['Lora-SemiBold-Italic', 'Georgia', 'serif'],
      },
      fontSize: {
        '3xs': ['9px', { lineHeight: '12px' }],
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:    ['12px', { lineHeight: '16px' }],
        sm:    ['13px', { lineHeight: '18px' }],
        base:  ['15px', { lineHeight: '22px' }],
        lg:    ['17px', { lineHeight: '24px' }],
        xl:    ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
        // Echo type scale (exact pixel values from EchoEntryRow/EchoScreen/EchoDetailPane)
        'echo-2xs':      ['10.5px', { lineHeight: '14px' }], // entry-list meta / timestamp caption
        'echo-xs':       ['12px',   { lineHeight: '16px' }], // entry-list preview / detail meta
        'echo-sm':       ['13.5px', { lineHeight: '18px' }], // entry-list title / add-entry button
        'echo-sm-loose': ['13.5px', { lineHeight: '20px' }], // detail empty-state subtitle
        'echo-base':     ['15px',   { lineHeight: '27px' }], // detail body copy
        'echo-md':       ['16px',   { lineHeight: '22px' }], // detail empty-state title
        'echo-lg':       ['26px',   { lineHeight: '34px' }], // detail entry title
      },
    },
  },
  plugins: [],
};
