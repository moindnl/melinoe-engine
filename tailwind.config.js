/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        mdb: {
          green:        '#00ed64',
          'green-dark': '#00684a',
          'green-mid':  '#00a35c',
          'green-soft': '#c3f0d2',
          teal:         '#001e2b',
          'teal-mid':   '#003d4f',
          canvas:       '#ffffff',
          surface:      '#f9fbfa',
          'surface-soft':'#f4f7f6',
          'surface-feature':'#e3fcef',
          hairline:     '#e1e5e8',
          'hairline-strong':'#c1ccd6',
          'hairline-dark':'#1c2d38',
          ink:          '#001e2b',
          charcoal:     '#1c2d38',
          slate:        '#3d4f5b',
          steel:        '#5c6c7a',
          stone:        '#7c8c9a',
          muted:        '#a8b3bc',
          'on-dark':    '#ffffff',
          'on-dark-muted':'#a8b3bc',
          'accent-purple':'#7b3ff2',
          'accent-orange':'#fa6e39',
        },
        // keep ios aliases for semantic states
        ios: {
          red:   '#FF3B30',
          green: '#34C759',
        }
      },
      fontFamily: {
        sans: ['Euclid Circular A', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['Source Code Pro', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'mdb-sm':  '6px',
        'mdb-md':  '8px',
        'mdb-lg':  '12px',
        'mdb-xl':  '16px',
        'mdb-xxl': '24px',
      },
      boxShadow: {
        'mdb-1': '0 1px 2px 0 rgba(0,30,43,0.04)',
        'mdb-2': '0 4px 12px 0 rgba(0,30,43,0.08)',
        'mdb-3': '0 12px 24px -4px rgba(0,30,43,0.12)',
      }
    },
  },
  plugins: [],
}

