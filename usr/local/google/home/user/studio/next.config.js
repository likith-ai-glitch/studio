/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  experimental: {
    // allowedDevOrigins should not be in experimental
  },
  // allowedDevOrigins should be a top-level property
  allowedDevOrigins: [
    "https://9015-firebase-studio-1754066778009.cluster-ejd22kqny5htuv5dfowoyipt52.cloudworkstations.dev"
  ]
};

module.exports = nextConfig;
