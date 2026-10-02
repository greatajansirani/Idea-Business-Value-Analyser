import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { port:3000, host:true, proxy:{ '/api':{ target:'http://localhost:5000', changeOrigin:true, secure:false } } },
  build: { outDir:'build', sourcemap:false },
  optimizeDeps: { include:['xlsx','jspdf','jspdf-autotable','file-saver','pptxgenjs','docx','react','react-dom','react-router-dom','axios','zustand','react-hot-toast','chart.js','react-chartjs-2'] },
  define: { 'process.env': {} },
})
