import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/TCRS-RESOURCE-APP/',
  plugins: [react()],
})
