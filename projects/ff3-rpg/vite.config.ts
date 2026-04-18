import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    fs: {
      // Allow serving assets from the repo root
      allow: [
        path.resolve(__dirname, '../..'),
      ],
    },
  },
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, '../../assets'),
    },
  },
});
