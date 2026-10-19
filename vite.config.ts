import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project URL: /PersonalStats/.
// Override with VITE_BASE=/ for a custom domain or root Pages site.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/PersonalStats/',
});
