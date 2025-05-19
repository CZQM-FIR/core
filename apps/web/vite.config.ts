import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5100
  },
  build: {
    rollupOptions: {
      external: ['@czqm/db/schema']
    }
  }
});
