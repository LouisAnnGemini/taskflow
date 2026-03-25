import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.TASKFLOW_SUPABASE_URL': JSON.stringify(env.TASKFLOW_SUPABASE_URL || env.VITE_TASKFLOW_SUPABASE_URL || 'https://aomnwqjhaeavkfereche.supabase.co'),
      'process.env.TASKFLOW_SUPABASE_ANON_KEY': JSON.stringify(env.TASKFLOW_SUPABASE_ANON_KEY || env.VITE_TASKFLOW_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvbW53cWpoYWVhdmtmZXJlY2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTM2MTIsImV4cCI6MjA4OTgyOTYxMn0.Z6FxCbaotO01xlPPlk00zyEklFEbyc-Ds1tCOw0BbAo'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
