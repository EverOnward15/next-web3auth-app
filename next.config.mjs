/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
        config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
    };
    return config;
  },
};

export default nextConfig;
