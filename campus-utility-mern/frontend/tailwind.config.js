/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Sora"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      colors: {
        midnight: {
          950: '#12103A',
          900: '#1B1854',
          800: '#242066',
          700: '#322C82',
        },
        marigold: {
          400: '#FFC24B',
          500: '#F5A623',
          600: '#DB8A0A',
        },
        teal: {
          400: '#2DD4BF',
          500: '#14B8A6',
        },
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(245, 166, 35, 0.45)',
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        floatSlow: 'floatSlow 6s ease-in-out infinite',
        popIn: 'popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
