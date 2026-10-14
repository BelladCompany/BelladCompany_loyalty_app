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
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Bellad Brand & Automotive Accents
        brand: {
          orange: '#FF6600',
          'orange-dark': '#CC5200',
          'orange-light': '#FF8533',
          navy: '#0F172A',
          primary: '#4F46E5', // Clean Smart CRM indigo/blue
        },
        action: {
          primary: '#4F46E5',
          'primary-hover': '#4338CA',
          danger: '#DC2626',
          success: '#16A34A',
          warning: '#D97706',
        },
        // Clean Light Dashboard Palette (from Image 1 & 2 References)
        surface: {
          screen: '#EBF0F5',
          card: '#FFFFFF',
          cardHover: '#F8FAFC',
          border: '#E2E8F0',
          divider: '#F1F5F9',
        },
        ink: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#64748B',
        },
      },
      boxShadow: {
        'island': '0 25px 60px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.8)',
        'card': '0 10px 30px -5px rgba(15, 23, 42, 0.04), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
        'purple': '0 20px 45px -10px rgba(124, 58, 237, 0.45)',
        'blue': '0 20px 45px -10px rgba(37, 99, 235, 0.4)',
        'orange': '0 16px 35px -8px rgba(234, 88, 12, 0.35)',
      },
      fontSize: {
        'xs': ['13px', '18px'],
        'sm': ['15px', '22px'],
        'base': ['17px', '26px'], // Upgraded to 16-18px range per user request
        'lg': ['20px', '28px'],
        'xl': ['24px', '32px'],
        '2xl': ['28px', '36px'],
        '3xl': ['36px', '44px'],
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
        '5xl': '40px',
      },
    },
  },
  plugins: [],
};
