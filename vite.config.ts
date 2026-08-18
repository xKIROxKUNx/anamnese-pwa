import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/anamnese-pwa/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png'],
      manifest: {
        name: 'Anamnese — roteiros clínicos em SOAP',
        short_name: 'Anamnese',
        description:
          'Roteiros completos de anamnese (geral, criança, gestante e idoso) organizados em SOAP, com PDF pronto para o prontuário.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/anamnese-pwa/',
        scope: '/anamnese-pwa/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f8fb',
        theme_color: '#2563eb',
        categories: ['medical', 'education', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true
      }
    })
  ]
})
