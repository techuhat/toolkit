module.exports = {
  content: [
    "./index.html",
    "./pages/**/*.{html,js}",
    "./js/**/*.js",
    "./components/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors - Electric Blue
        primary: {
          DEFAULT: "#00a8ff", // electric-blue
          50: "#e6f7ff", // electric-blue-50
          100: "#b3e5ff", // electric-blue-100
          200: "#80d3ff", // electric-blue-200
          300: "#4dc1ff", // electric-blue-300
          400: "#1aafff", // electric-blue-400
          500: "#00a8ff", // electric-blue-500
          600: "#0087cc", // electric-blue-600
          700: "#006699", // electric-blue-700
          800: "#004466", // electric-blue-800
          900: "#002233", // electric-blue-900
        },
        
        // Secondary Colors - Gray
        secondary: {
          DEFAULT: "#2d2d2d", // gray-800
          50: "#f7f7f7", // gray-50
          100: "#e3e3e3", // gray-100
          200: "#c8c8c8", // gray-200
          300: "#a4a4a4", // gray-300
          400: "#818181", // gray-400
          500: "#666666", // gray-500
          600: "#515151", // gray-600
          700: "#434343", // gray-700
          800: "#2d2d2d", // gray-800
          900: "#1f1f1f", // gray-900
        },
        
        // Accent Colors - Green
        accent: {
          DEFAULT: "#2ed573", // green-500
          50: "#f0fdf4", // green-50
          100: "#dcfce7", // green-100
          200: "#bbf7d0", // green-200
          300: "#86efac", // green-300
          400: "#4ade80", // green-400
          500: "#2ed573", // green-500
          600: "#16a34a", // green-600
          700: "#15803d", // green-700
          800: "#166534", // green-800
          900: "#14532d", // green-900
        },
        
        // Background Colors
        background: {
          DEFAULT: "#1a1a1a", // neutral-900
          light: "#262626", // neutral-800
          lighter: "#404040", // neutral-700
        },
        
        // Surface Colors
        surface: {
          DEFAULT: "#333333", // neutral-700
          light: "#404040", // neutral-600
          lighter: "#525252", // neutral-500
        },
        
        // Text Colors
        text: {
          primary: "#ffffff", // white
          secondary: "#b3b3b3", // neutral-400
          tertiary: "#737373", // neutral-500
        },
        
        // Status Colors
        success: {
          DEFAULT: "#2ed573", // green-500
          50: "#f0fdf4", // green-50
          100: "#dcfce7", // green-100
          500: "#2ed573", // green-500
          600: "#16a34a", // green-600
          700: "#15803d", // green-700
        },
        
        warning: {
          DEFAULT: "#ffa502", // orange-500
          50: "#fff7ed", // orange-50
          100: "#ffedd5", // orange-100
          500: "#ffa502", // orange-500
          600: "#ea580c", // orange-600
          700: "#c2410c", // orange-700
        },
        
        error: {
          DEFAULT: "#ff3838", // red-500
          50: "#fef2f2", // red-50
          100: "#fee2e2", // red-100
          500: "#ff3838", // red-500
          600: "#dc2626", // red-600
          700: "#b91c1c", // red-700
        },
        
        // Border Colors
        border: {
          DEFAULT: "#404040", // neutral-600
          light: "#525252", // neutral-500
          lighter: "#737373", // neutral-400
        },
      },
      
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        jetbrains: ['JetBrains Mono', 'monospace'],
      },
      
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.25)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'processing': '0 0 20px rgba(0, 168, 255, 0.3)',
        'success': '0 0 20px rgba(46, 213, 115, 0.3)',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'success-bounce': 'successBounce 0.6s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
      },
      
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      backdropBlur: {
        xs: '2px',
      },
      
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
}