import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        border: 'var(--border-color)',
        'border-subtle': 'var(--border-subtle)',
        'muted-foreground': 'var(--muted-foreground)',
        // Accent palette — driven by CSS variables so color presets
        // can swap the entire hue without touching component class names.
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          bg: 'var(--accent-primary-bg)',
          text: 'var(--accent-primary-text)',
        },
        cyan: {
          50: 'rgb(var(--color-cyan-50) / <alpha-value>)',
          100: 'rgb(var(--color-cyan-100) / <alpha-value>)',
          200: 'rgb(var(--color-cyan-200) / <alpha-value>)',
          300: 'rgb(var(--color-cyan-300) / <alpha-value>)',
          400: 'rgb(var(--color-cyan-400) / <alpha-value>)',
          500: 'rgb(var(--color-cyan-500) / <alpha-value>)',
          600: 'rgb(var(--color-cyan-600) / <alpha-value>)',
          700: 'rgb(var(--color-cyan-700) / <alpha-value>)',
          800: 'rgb(var(--color-cyan-800) / <alpha-value>)',
          900: 'rgb(var(--color-cyan-900) / <alpha-value>)',
          950: 'rgb(var(--color-cyan-950) / <alpha-value>)',
        },
      },
      borderColor: {
        DEFAULT: 'var(--border-color)',
      },
      backgroundColor: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        overlay: 'var(--bg-overlay)',
        hover: 'var(--bg-hover)',
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        accent: 'var(--text-accent)',
      },
    }
  },
  plugins: [
    require("tailwind-scrollbar-hide")
  ]
};

export default config;
