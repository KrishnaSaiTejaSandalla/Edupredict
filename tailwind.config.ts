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
      },
      borderColor: {
        DEFAULT: 'var(--border-color)',
      }
    }
  },
  plugins: [
    require("tailwind-scrollbar-hide")
  ]
};

export default config;
