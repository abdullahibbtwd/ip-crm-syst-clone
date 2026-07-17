import path from 'node:path'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')
  const backendTarget =
    env.API_URL?.replace(/\/$/, '') ??
    `http://127.0.0.1:${env.BACKEND_PORT ?? env.PORT ?? '3002'}`

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              const code = (err as NodeJS.ErrnoException).code
              if (
                code === 'ECONNREFUSED' ||
                code === 'ECONNRESET' ||
                code === 'ECONNABORTED'
              ) {
                return
              }
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'text/plain' })
              }
              res?.end?.('API proxy error')
              console.error('[vite] api proxy error:', err)
            })
          },
        },
        '/socket.io': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              const code = (err as NodeJS.ErrnoException).code
              // Benign during backend restarts, HMR, or mid-handshake disconnects.
              if (
                code === 'ECONNABORTED' ||
                code === 'ECONNRESET' ||
                code === 'ECONNREFUSED'
              ) {
                return
              }
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'text/plain' })
              }
              res?.end?.('Socket proxy error')
              console.error('[vite] socket.io proxy error:', err)
            })
          },
        },
      },
    },
  }
})
