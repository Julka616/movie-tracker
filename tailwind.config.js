/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: '#12100E',
        stage: '#1D1917',
        stage2: '#241F1C',
        marquee: '#E3A72F',
        marquee2: '#F4C765',
        velvet: '#A33B4A',
        reel: '#3A332C',
        paper: '#F3ECDD',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
