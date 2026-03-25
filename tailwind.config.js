/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cemedis: {
          primary: '#4361ee',
          secondary: '#2ec4b6',
          warning: '#f4a261',
          danger: '#e63946',
          light: '#f0f2f8',
          dark: '#1a1a2e',
          sidebar: '#1e2a5a',
          'sidebar-dark': '#12122a',
        },
      },
    },
  },
  plugins: [],
};
