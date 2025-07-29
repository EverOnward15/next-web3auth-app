// next.config.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));



/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode
  reactStrictMode: true,
  
  // Configure Webpack
  webpack: (config, { isServer, webpack }) => {
    // Enable async WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      topLevelAwait: true,
    };

    // Client-side specific configurations
    if (!isServer) {
      // Essential polyfills for Bitcoin operations
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "buffer": require.resolve("buffer/"),
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert/"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "url": require.resolve("url/"),
        "util": require.resolve("util/"),
        "zlib": require.resolve("browserify-zlib"),
        "net": false, // Not available in browser
        "tls": false, // Not available in browser
        "fs": false, // Not available in browser
        "path": require.resolve("path-browserify"),
      };

      // Add global polyfills
      config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
          process: "process/browser",
          Buffer: ["buffer", "Buffer"],
        }),
        new webpack.NormalModuleReplacementPlugin(
          /node:crypto/,
          require.resolve("crypto-browserify")
        ),
      ]);
    }

    // Add BitcoinJS specific optimizations
    config.module = {
      ...config.module,
      rules: [
        ...config.module.rules,
        {
          test: /\.m?js$/,
          resolve: {
            fullySpecified: false, // Disable fully specified imports
          },
        },
      ],
    };

    config.resolve.alias = {
      // Force all imports of "bitcoinjs-lib" to point to *this* exact path:
      'bitcoinjs-lib$': path.resolve(__dirname, 'node_modules/bitcoinjs-lib'),
      ...config.resolve.alias,
    };

    return config;
  },

  // Enable ESM externals for better compatibility
  experimental: {
    esmExternals: 'loose',
    serverComponentsExternalPackages: [
      'bitcoinjs-lib',
      '@noble/secp256k1',
      '@noble/hashes',
      'buffer',
      'crypto-browserify'
    ],
  },

  // Optional: Configure transpilePackages if needed
  transpilePackages: [
    '@web3auth',
    '@web3auth/base',
    '@web3auth/single-factor-auth'
  ],
};

export default nextConfig;