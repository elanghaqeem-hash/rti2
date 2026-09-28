/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B1F3A',
          700: '#13305A',
          500: '#1B3E70',
        },
        blue: {
          600: '#1F5BD8',
          400: '#4F86F0',
          50: '#E3EBFB',
        },
        gold: {
          300: '#F3C94A',
          500: '#E4A11B',
          600: '#C7840B',
        },
        beige: {
          50: '#F7F2EA',
          200: '#EDE3D2',
        },
        grey: {
          50: '#EEF1F5',
        },
        line: '#D5DBE4',
        muted: '#5A6A80',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      backgroundImage: {
        'gold-grad': 'linear-gradient(45deg, #EE7A1E, #EFA41C 55%, #F1D21B)',
      },
    },
  },
  plugins: [],
};
