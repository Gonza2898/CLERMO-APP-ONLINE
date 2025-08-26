import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // <-- 1. IMPORTAMOS EL PLUGIN

export default defineConfig({
  plugins: [
    react(),
    // --- 2. AÑADIMOS LA CONFIGURACIÓN DEL PLUGIN ---
    VitePWA({
      registerType: 'autoUpdate', // Se actualizará automáticamente
      manifest: {
        name: 'CLERMO App',
        short_name: 'CLERMO',
        description: 'Tu Centro de Control Agrícola.',
        theme_color: '#111827', // Color de la barra de título en Android
        background_color: '#030712', // Color de fondo al iniciar
        icons: [
          {
            src: 'pwa-192x192.png', // Ícono para Android
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // Ícono más grande
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})