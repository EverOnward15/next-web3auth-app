// next.config.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Enable async WebAssembly for better performance with certain libraries
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Only apply polyfills for the client-side bundle
    // Server-side Node.js environment already has these modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // Node.js core modules to polyfill for the browser environment
        "buffer": require.resolve("buffer/"),
        "stream": require.resolve("stream-browserify"),
        "crypto": require.resolve("crypto-browserify"),
        "assert": require.resolve("assert/"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify"),
        "url": require.resolve("url/"),
        "util": require.resolve("util/"), // Often needed for other polyfills
        // Add other fallbacks if you encounter more "Module not found" errors
      };

      // ProvidePlugin makes Buffer and process globally available
      // This is often required by libraries that expect these globals
      config.plugins = (config.plugins || []).concat([
        new (require("webpack").ProvidePlugin)({
          process: "process/browser", // Polyfill for Node.js 'process' global
          Buffer: ["buffer", "Buffer"], // Polyfill for Node.js 'Buffer' global
        }),
      ]);
    }

    return config;
  },
};

export default nextConfig;