/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["'Playfair Display'", 'Georgia', 'serif'],
        sans: ["'Inter'", '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      colors: {
        naval: {
          950: '#070d18',
          900: '#0b1426',
          800: '#122240',
          700: '#1b325f',
          600: '#25447f',
          500: '#325aa8',
        }
      }
    },
  },
  plugins: [],
}
