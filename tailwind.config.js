/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  safelist: [
    'theme-dark',
    'theme-light',
    'sidebar-dark',
    'sidebar-light',
    'header-dark',
    'header-light',
    'card-dark',
    'card-light',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
