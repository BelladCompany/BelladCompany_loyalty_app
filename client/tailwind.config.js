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
        // ── Bellad Brand Colors (extracted from logo: pure #FF6600 orange) ──
        brand: {
          // Primary brand orange — exact color from Bellad gear logo
          orange: '#FF6600',
          'orange-dark': '#CC5200',
          'orange-darker': '#993D00',
          'orange-light': '#FF8533',
          'orange-lighter': '#FFAA80',
          'orange-muted': '#FFF0E6',
          'orange-surface': '#FFF7F0',
          // Legacy alias — kept so existing brand-gold classes don't break
          gold: '#FF6600',
          'gold-light': '#FF8533',
          'gold-dark': '#CC5200',
          'gold-amber': '#FFAA80',
          // Dark navy for sidebar / high-contrast backgrounds
          navy: '#0A1128',
          'navy-light': '#1E293B',
          'navy-dark': '#030712',
          slate: '#64748B',
          surface: '#F8FAFC',
          border: '#E2E8F0',
          // Convenience primary alias used in some components
          primary: '#FF6600',
        },
        // ── Action / Semantic Colors ──
        action: {
          // Primary CTA uses Bellad orange
          primary: '#FF6600',
          'primary-hover': '#CC5200',
          'primary-active': '#993D00',
          'primary-light': '#FFF0E6',
          danger: '#DC2626',
          'danger-hover': '#B91C1C',
          'danger-light': '#FEF2F2',
          success: '#16A34A',
          'success-hover': '#15803D',
          'success-light': '#F0FDF4',
          warning: '#D97706',
          'warning-light': '#FFFBEB',
        },
        // ── Surface / Layer Colors ──
        surface: {
          screen: '#F8FAFC',
          card: '#FFFFFF',
          border: '#CBD5E1',
          divider: '#E2E8F0',
        },
        // ── Ink / Text Colors ──
        ink: {
          primary: '#0F172A',
          secondary: '#334155',
          muted: '#64748B',
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(15, 23, 42, 0.08)',
        'orange': '0 4px 20px -2px rgba(255, 102, 0, 0.30)',
        'orange-sm': '0 2px 8px -1px rgba(255, 102, 0, 0.20)',
        // Legacy alias
        'gold': '0 4px 20px -2px rgba(255, 102, 0, 0.30)',
      },
      minHeight: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['14px', '20px'],
        'base': ['16px', '24px'],
        'lg': ['18px', '26px'],
        'xl': ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '36px'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
      backgroundSize: {
        '300%': '300%',
      },
    },
  },
  plugins: [],
}
