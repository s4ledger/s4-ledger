/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#007AFF',
        surface: '#ffffff',
        steel: '#6e6e73',
        border: 'rgba(0,0,0,0.08)',
        green: { s4: '#34c759' },
        red: { s4: '#ff3b30' },
        yellow: { s4: '#ff9500' },
        gold: '#c9a84c',
      },
      borderRadius: {
        card: '12px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
