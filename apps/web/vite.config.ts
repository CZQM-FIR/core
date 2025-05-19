import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5100
  },
  resolve: {
    alias: {
      '@czqm/db/schema': path.resolve(__dirname, '../../packages/db/dist/index.js')
    }
  },
  build: {
    rollupOptions: {
      external: ['@czqm/db/schema']
    }
  }
});
