import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import content from './scripts/content-plugin.ts'

// base './' + hash-роутинг + один HTML-файл = сборка открывается и с сервера (PWA),
// и двойным кликом по index.html (file://) без интернета.
export default defineConfig({
  base: './',
  plugins: [preact(), content(), viteSingleFile({ removeViteModuleLoader: true })],
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    target: 'es2019',
    outDir: 'dist',
    emptyOutDir: true,
    reportCompressedSize: false,
  },
})
