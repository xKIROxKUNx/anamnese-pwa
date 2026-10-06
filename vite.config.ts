import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

declare const process: { env: Record<string, string | undefined> }

// Identidade desta build: a versão do package.json e o commit do deploy (no CI) ou
// um carimbo de tempo (build local). O mesmo valor vai para o app e para o
// version.json, que o atualizador compara com o que está publicado.
const buildId = (process.env.GITHUB_SHA ?? '').slice(0, 7) || Date.now().toString(36)
const builtAt = new Date().toISOString()

function versionJson(): Plugin {
  return {
    name: 'anamnese-version-json',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version: pkg.version, build: buildId, builtAt }, null, 2),
      })
    },
  }
}

// Caminho a partir da raiz do projeto — resolvido pelo próprio Vite.
const stub = '/src/lib/jspdf-optional-stub.ts'

export default defineConfig({
  base: '/anamnese-pwa/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  resolve: {
    // Dependências opcionais do jsPDF que o app nunca carrega.
    alias: { html2canvas: stub, dompurify: stub, canvg: stub },
  },
  plugins: [
    react(),
    versionJson(),
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
