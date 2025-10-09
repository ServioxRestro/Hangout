/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hmsgfbaelsawpoubclkx.supabase.co',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
