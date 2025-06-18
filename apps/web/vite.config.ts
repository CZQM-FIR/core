import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sentrySvelteKit({
      sourceMapsUploadOptions: {
        org: 'czqm-fir',
        project: 'javascript-sveltekit'
      }
    }),
    sveltekit()
  ],
  server: {
    port: 5100
  }
});
