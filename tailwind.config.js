/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        tiktok: {
          red: '#fe2c55',
          cyan: '#25f4ee',
          dark: '#0a0a0a',
          surface: '#141414',
          border: '#2a2a2a',
          muted: '#a0a0a0'
        }
      }
    }
  },
  plugins: []
}
