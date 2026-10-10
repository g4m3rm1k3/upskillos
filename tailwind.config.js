/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Tutorial projects may have their own installed dependencies.
    "!./src/**/node_modules/**",
  ],
  // Python slicing in lesson prose is not a Tailwind arbitrary CSS property.
  blocklist: ["[-3:-1]"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'rgb(var(--tw-custom-brand-50) / <alpha-value>)',
          100: 'rgb(var(--tw-custom-brand-100) / <alpha-value>)',
          200: 'rgb(var(--tw-custom-brand-200) / <alpha-value>)',
          300: 'rgb(var(--tw-custom-brand-300) / <alpha-value>)',
          400: 'rgb(var(--tw-custom-brand-400) / <alpha-value>)',
          500: 'rgb(var(--tw-custom-brand-500) / <alpha-value>)',
          600: 'rgb(var(--tw-custom-brand-600) / <alpha-value>)',
          700: 'rgb(var(--tw-custom-brand-700) / <alpha-value>)',
          800: 'rgb(var(--tw-custom-brand-800) / <alpha-value>)',
          900: 'rgb(var(--tw-custom-brand-900) / <alpha-value>)',
          950: 'rgb(var(--tw-custom-brand-950) / <alpha-value>)',
        },
        slate: {
          50: 'rgb(var(--tw-custom-slate-50) / <alpha-value>)',
          100: 'rgb(var(--tw-custom-slate-100) / <alpha-value>)',
          200: 'rgb(var(--tw-custom-slate-200) / <alpha-value>)',
          300: 'rgb(var(--tw-custom-slate-300) / <alpha-value>)',
          400: 'rgb(var(--tw-custom-slate-400) / <alpha-value>)',
          500: 'rgb(var(--tw-custom-slate-500) / <alpha-value>)',
          600: 'rgb(var(--tw-custom-slate-600) / <alpha-value>)',
          700: 'rgb(var(--tw-custom-slate-700) / <alpha-value>)',
          800: 'rgb(var(--tw-custom-slate-800) / <alpha-value>)',
          900: 'rgb(var(--tw-custom-slate-900) / <alpha-value>)',
          950: 'rgb(var(--tw-custom-slate-950) / <alpha-value>)',
        },
        sky: {
          50: 'rgb(var(--tw-custom-sky-50) / <alpha-value>)',
          100: 'rgb(var(--tw-custom-sky-100) / <alpha-value>)',
          200: 'rgb(var(--tw-custom-sky-200) / <alpha-value>)',
          300: 'rgb(var(--tw-custom-sky-300) / <alpha-value>)',
          400: 'rgb(var(--tw-custom-sky-400) / <alpha-value>)',
          500: 'rgb(var(--tw-custom-sky-500) / <alpha-value>)',
          600: 'rgb(var(--tw-custom-sky-600) / <alpha-value>)',
          700: 'rgb(var(--tw-custom-sky-700) / <alpha-value>)',
          800: 'rgb(var(--tw-custom-sky-800) / <alpha-value>)',
          900: 'rgb(var(--tw-custom-sky-900) / <alpha-value>)',
          950: 'rgb(var(--tw-custom-sky-950) / <alpha-value>)',
        },
        // Semantic tokens backed by CSS variables — auto dark-mode aware
        surface:    'var(--color-surface)',
        border:     'var(--color-border)',
        'text-muted': 'var(--color-text-muted)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.slate.800'),
            maxWidth: 'none',
          }
        },
        dark: {
          css: {
            color: theme('colors.slate.200'),
          }
        }
      })
    },
  },
  plugins: [],
}
