import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the built app works from any path (file://, a subfolder
  // on a home server reached over Tailscale, GitHub Pages, …).
  base: './',
  server: {
    host: true, // listen on all interfaces so a phone on the tailnet can reach `vite dev`
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
