import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api/gstatic-models': {
        target: 'https://www.gstatic.com',
        changeOrigin: true,
        rewrite: (reqPath: string) =>
          reqPath.replace(/^\/api\/gstatic-models/, '/aistudio/starter-apps/desk-racer/models'),
      },
      '/assets/models': {
        target: 'https://www.gstatic.com',
        changeOrigin: true,
        rewrite: (reqPath: string) =>
          reqPath.replace(/^\/assets\/models/, '/aistudio/starter-apps/desk-racer/models'),
      },
    },
  },
});
