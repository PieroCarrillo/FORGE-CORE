/** @type {import('tailwindcss').Config} */
export default {
  // Archivos que Tailwind escanea para generar solo las clases usadas.
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Paleta propia del proyecto FORGE CORE.
      colors: {
        forge: {
          graphite: '#111318',
          panel: '#171a21',
          edge: '#272d36',
          neon: '#49f0ff',
          amber: '#f6c453',
          lime: '#9be564'
        }
      },
      // Sombra reutilizable para tarjetas de hardware.
      boxShadow: {
        glow: '0 0 35px rgba(73, 240, 255, 0.2)'
      }
    }
  },
  plugins: []
};
