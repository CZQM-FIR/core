import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Set default body size limit to 10MB for file uploads if not already set
process.env.BODY_SIZE_LIMIT = process.env.BODY_SIZE_LIMIT || '10485760';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	server: {
		port: 5101
	}
});
