/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: 'export', 
  distDir: 'dist', 
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
