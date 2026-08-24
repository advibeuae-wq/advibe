/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      borderRadius: {
        lg: '0.5rem',
        md: 'calc(0.5rem - 2px)',
        sm: 'calc(0.5rem - 4px)',
      },
    },
  },
  // Preflight is OFF on purpose: this bundle is embedded into an existing static
  // HTML page (../index.html) that has its own global CSS (../css/styles.css,
  // ../css/tokens.css). Tailwind's preflight reset would clobber that page's base
  // typography/box-sizing/button/h1 styles site-wide. The widget's own subtree is
  // scoped instead (see #advibe-case-study-widget-root in the host page), and the
  // component only relies on utility classes, not on preflight's resets.
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
