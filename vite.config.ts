import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 1. THIS IS MANDATORY FOR GITHUB PAGES:
  base: '/uploadcv/', 

  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  // 2. THIS PREVENTS THE CRASH (The wallpaper issue):
  define: {
    'process.env': {},
    'process.env.API_KEY': JSON.stringify(""),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});