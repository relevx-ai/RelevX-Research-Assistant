/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable react-native-web
  transpilePackages: ["react-native", "react-native-web", "ui", "core"],

  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native$": "react-native-web",
    };

    config.resolve.extensions = [
      ".web.js",
      ".web.jsx",
      ".web.ts",
      ".web.tsx",
      ...config.resolve.extensions,
    ];

    return config;
  },
};

export default nextConfig;
