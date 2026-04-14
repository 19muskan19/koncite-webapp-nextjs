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
    'dropdown-panel-bg',
  ],
  theme: {
    extend: {
      keyframes: {
        /* Duplicated row: 0 and -50% match visually → seamless loop; motion is right-to-left */
        'partners-marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        /* Seamless loop: duplicated row + translateX(-50%) */
        'partners-marquee': 'partners-marquee 55s linear infinite',
      },
      colors: {
        'dropdown-panel': '#2e343d',
        'dropdown-panel-hover': '#3f4756',
      },
      screens: {
        xs: '475px',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        // ChatGPT-style: same clean sans-serif for both user and AI messages
        'chat-user': ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'chat-ai': ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
