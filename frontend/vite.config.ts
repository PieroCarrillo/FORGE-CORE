import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Permite abrir Vite desde localhost o desde otra IP si se prueba en red.
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // En desarrollo, las llamadas /api del frontend se redirigen al backend local.
      '/api': 'http://localhost:4000'
    }
  }
});
