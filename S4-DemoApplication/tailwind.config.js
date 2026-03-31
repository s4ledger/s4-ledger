/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#007AFF',
        surface: '#1c1c1e',
        steel: '#8b8fa3',
        border: 'rgba(255,255,255,0.08)',
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
