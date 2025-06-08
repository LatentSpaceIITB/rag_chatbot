import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  // optimizeDeps: {
  //   include: ['pdfjs-dist/build/pdf.worker.min.js'],
  // },
})