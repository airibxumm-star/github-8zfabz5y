import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'src/index.html',
        repo: 'src/repo/index.html',
        install: 'src/install/index.html',
        guide: 'src/guide/index.html',
        profile: 'src/profile/index.html',
        support: 'src/support/index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});