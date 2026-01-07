import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '')

  return {
    // './' allows the app to work on any path (e.g. domain.com/subfolder/ or domain.com/)
    // This is helpful for IPFS, local file opening, or strange hosting setups.
    base: './', 
    plugins: [react()],
    define: {
      // Safely inject the API key globally. 
      // NOTE: In a public app, this key is visible to users. 
      // For a personal app, this is acceptable.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false, // Disable sourcemaps in production to save size
      minify: 'esbuild',
      // CRITICAL FIX FOR MOBILE: Lower target to ensure iOS Safari compatibility
      target: ['es2015', 'chrome87', 'safari13'], 
    },
    server: {
      port: 3000,
      open: true,
      host: true // Allow access from local network (mobile testing)
    }
  }
})