import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import webExtension from 'vite-plugin-web-extension'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: path.resolve(__dirname, 'src'),
  plugins: [
    react(),
    webExtension({
      manifest: 'manifest.json',
      disableAutoLaunch: true,
      skipManifestValidation: true,
      additionalInputs: ['offscreen/tts.html', 'export/index.html'],
    }),
  ],
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
})
