import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.FRONTEND_PORT || '3099', 10),
    proxy: {
      '/api': `http://localhost:${process.env.BACKEND_PORT || '4099'}`,
    },
  },
});
