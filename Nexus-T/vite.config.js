import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Habilita Fast Refresh explícitamente
      fastRefresh: true,
    }),
  ],
  server: {
    // Asegura que HMR esté habilitado
    hmr: true,
    // Configura el puerto (opcional, por defecto es 5173)
    port: 5173,
    // Habilita la recarga automática
    watch: {
      usePolling: false,
    },
  },
})