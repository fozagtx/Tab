import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ['@nimiq/core'],
  // Cloudflare quick tunnels + Nimiq Pay WebView need to load /_next assets.
  allowedDevOrigins: [
    '*.trycloudflare.com',
    'localhost',
    '127.0.0.1',
  ],
}

export default nextConfig
