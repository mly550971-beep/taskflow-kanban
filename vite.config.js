import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' makes the built site work from any GitHub Pages path
// (https://USER.github.io/REPO/) without hardcoding the repository name.
export default defineConfig({
  base: './',
  plugins: [react()],
});
