import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Allow the sandbox preview domain (e.g. 3000-xxxx.e2b.app) to load the app.
        allowedHosts: ['.e2b.app'],
        hmr: false,
        proxy: {
          '/ollama': {
            target: 'http://localhost:11434',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/ollama/, '')
          }
        }
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
