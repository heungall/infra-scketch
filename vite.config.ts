import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// GitHub Pages 는 https://heungall.github.io/infra-scketch/ 하위 경로로 서비스되므로
// 빌드 시에만 base 를 저장소 이름으로 지정한다. (dev 서버는 루트 '/' 유지)
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/infra-scketch/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(),
  ],
  server: {
    port: 5176,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3100',
    },
  },
}))
