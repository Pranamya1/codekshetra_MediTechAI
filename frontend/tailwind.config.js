/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // MediCare AI brand palette
        brand: {
          50:  '#eef9ff',
          100: '#d8f0ff',
          200: '#b9e5ff',
          300: '#89d6ff',
          400: '#52beff',
          500: '#2aa0ff',
          600: '#1480f5',
          700: '#0d64e0',
          800: '#1250b5',
          900: '#14468e',
          950: '#0f2c5c',
        },
        medical: {
          green:  '#10b981',
          red:    '#ef4444',
          amber:  '#f59e0b',
          purple: '#8b5cf6',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient':
          'linear-gradient(135deg, #0f2c5c 0%, #1480f5 50%, #2aa0ff 100%)',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
        card:  '0 2px 16px 0 rgba(0,0,0,0.08)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
