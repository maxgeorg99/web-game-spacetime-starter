import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        game: resolve(import.meta.dirname, 'index.html'),
        signin: resolve(import.meta.dirname, 'auth/index.html'),
        callback: resolve(import.meta.dirname, 'auth/callback.html'),
        androidCallback: resolve(import.meta.dirname, 'auth/android.html'),
      },
    },
  },
});
