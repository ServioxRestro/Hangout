import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    fontFamily: {
      'inter': ['Inter', 'sans-serif'],
    },
    extend: {
      colors: {
        // Brand Colors
        brand: {
          primary: "hsl(var(--brand-primary))",
          'primary-dark': "hsl(var(--brand-primary-dark))",
          'primary-light': "hsl(var(--brand-primary-light))",
          secondary: "hsl(var(--brand-secondary))",
          accent: "hsl(var(--brand-accent))",
        },
        
        // Semantic Colors
        success: {
          DEFAULT: "hsl(var(--success))",
          light: "hsl(var(--success-light))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          light: "hsl(var(--warning-light))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          light: "hsl(var(--error-light))",
        },
        
        // Surface Colors
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        'surface-elevated': "hsl(var(--surface-elevated))",
        
        // Border Colors
        border: "hsl(var(--border))",
        'border-light': "hsl(var(--border-light))",
        
        // Text Colors
        text: {
          primary: "hsl(var(--text-primary))",
          secondary: "hsl(var(--text-secondary))",
          tertiary: "hsl(var(--text-tertiary))",
          'on-primary': "hsl(var(--text-on-primary))",
        },
        
        // Interactive States
        interactive: {
          hover: "hsl(var(--interactive-hover))",
          pressed: "hsl(var(--interactive-pressed))",
        },
        
        // Legacy support for existing components
        primary: {
          DEFAULT: "hsl(var(--brand-primary))",
          foreground: "hsl(var(--text-on-primary))",
        },
        secondary: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--text-primary))",
        },
        muted: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--text-secondary))",
        },
      },
      
      borderRadius: {
        'xs': 'var(--radius-sm)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      
      spacing: {
        'xs': 'var(--space-xs)',
        'sm': 'var(--space-sm)',
        'md': 'var(--space-md)',
        'lg': 'var(--space-lg)',
        'xl': 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
      },
      
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}

export default config
