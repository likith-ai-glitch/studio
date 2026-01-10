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
  // This allows the Next.js dev server to accept requests from the proxied URL in Firebase Studio.
  allowedDevOrigins: ["https://9015-firebase-studio-1754066778009.cluster-ejd22kqny5htuv5dfowoyipt52.cloudworkstations.dev"],
  experimental: {
    serverActions: {
      allowedOrigins: ["9015-firebase-studio-1754066778009.cluster-ejd22kqny5htuv5dfowoyipt52.cloudworkstations.dev", "9013-firebase-studio-1754066778009.cluster-ejd22kqny5htuv5dfowoyipt52.cloudworkstations.dev"]
    }
  }
};

module.exports = nextConfig;
