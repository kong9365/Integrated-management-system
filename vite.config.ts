import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      'buffer': 'buffer',
      'stream': 'stream-browserify',
      'util': 'util',
    },
  },
  define: {
    'global': 'globalThis',
  },
  optimizeDeps: {
    include: ['plotly.js', 'react-plotly.js', 'buffer', 'stream-browserify', 'util'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  // middlewareMode에서는 server 설정이 필요 없음
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
});

