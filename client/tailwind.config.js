/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        action: {
          primary: '#1E40AF', // blue-800
          'primary-hover': '#1D4ED8', // blue-700
          'primary-active': '#172554', // blue-950
          'primary-light': '#EFF6FF', // blue-50
          danger: '#B91C1C', // red-700
          'danger-hover': '#991B1B', // red-800
          'danger-light': '#FEF2F2', // red-50
          success: '#15803D', // green-700
          'success-hover': '#166534', // green-800
          'success-light': '#F0FDF4', // green-50
        },
        surface: {
          screen: '#F8FAFC',
          card: '#FFFFFF',
          border: '#CBD5E1',
          divider: '#E2E8F0',
        },
        ink: {
          primary: '#0F172A',
          secondary: '#334155',
          muted: '#475569',
        }
      },
      minHeight: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      fontSize: {
        'base': ['16px', '24px'],
        'lg': ['18px', '26px'],
        'xl': ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '36px'],
      }
    },
  },
  plugins: [],
}
