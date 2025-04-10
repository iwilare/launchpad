// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/launchpad/',
  server: {
    port: 3000,
    open: true,
    // Enable HMR (Hot Module Replacement)
    hmr: true
  }
});
