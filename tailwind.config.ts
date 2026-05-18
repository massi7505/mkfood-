import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#2563EB',
          foreground: '#FFFFFF'
        }
      },
      fontFamily: {
        display: ['var(--font-sans)'],
        mono: ['var(--font-mono)']
      }
    }
  }
};

export default config;
