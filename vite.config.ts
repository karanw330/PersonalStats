import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// With a repository named "devpulse" the public URL is /devpulse/.
// Set VITE_BASE=/ for a custom domain or a <username>.github.io repo.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/devpulse/',
});
