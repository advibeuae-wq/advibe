import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// This project builds ONE thing: a self-contained IIFE bundle + CSS file for the
// EarbudShowcase "after" demo used in the case-study section of the static site.
// It is NOT the site itself — the static site in ../ stays plain HTML/CSS/JS.
// Output goes to ../case-study-widget/ with fixed (unhashed) filenames so the
// static index.html can reference them directly via <script>/<link> tags.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // React (and some of its deps) reference `process.env.NODE_ENV` directly.
  // Vite inlines this automatically for a normal app build, but not for
  // library/IIFE builds — without this the bundle throws "process is not
  // defined" as soon as it runs in the browser.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: path.resolve(__dirname, '../case-study-widget'),
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: path.resolve(__dirname, 'src/main.tsx'),
      name: 'AdvibeCaseStudyWidget',
      formats: ['iife'],
      fileName: () => 'case-study-widget.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'case-study-widget[extname]',
      },
    },
  },
});
