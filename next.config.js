/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["9013-firebase-studio-1754066778009.cluster-ejd22kqny5htuv5dfowoyipt52.cloudworkstations.dev"]
    }
  }
};

module.exports = nextConfig;
