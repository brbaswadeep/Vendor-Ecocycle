/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#E35336',    // Primary Action
          cream: '#F5F5DC',  // Background
          orange: '#F4A460', // Secondary
          brown: '#A0522D',  // Accent
          black: '#000000',  // Text (Strict Black)
        }
      }
    },
  },
  plugins: [],
}
