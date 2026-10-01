import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Split heavy dependencies (Firebase SDK, Lucide icons, Gemini SDK) into separate vendor chunk
              if (
                id.includes('firebase') ||
                id.includes('@firebase') ||
                id.includes('lucide-react') ||
                id.includes('@google/genai') ||
                id.includes('@google/generative-ai')
              ) {
                return 'vendor';
              }
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
