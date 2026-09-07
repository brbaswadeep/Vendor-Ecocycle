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
          cream: '#F5F5DC',  // Background (exact brand cream matching customer app)
          orange: '#F4A460', // Secondary
          brown: '#5C2812',  // Accent & Text (Dark roasted coffee)
          black: '#000000',  // Text (Strict Black)
          green: '#2E8B57',  // SeaGreen
        }
      }
    },
  },
  plugins: [],
}
