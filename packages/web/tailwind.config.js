/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          forest: '#063B27',
          forestDeep: '#022B1D',
          gold: '#C6922E',
          goldSoft: '#E2BD70',
        },
        surface: {
          ivory: '#F7F0E2',
          paper: '#FFFDF7',
          white: '#FFFFFF',
        },
        kathaText: {
          primary: '#20251F',
          muted: '#716F65',
        },
        kathaBorder: {
          subtle: '#E6DDCA',
        },
      },
      fontFamily: {
        serif: ['Cormorant Garamond', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
