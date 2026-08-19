import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Finance Tracker',
        short_name: 'Finance',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        icons: [
          // Tu pourras ajouter tes icônes 192x192 et 512x512 plus tard ici
        ]
      }
    })
  ],
})