/** @type {import('next').NextConfig} */
const nextConfig = {
  // `encoding` ve `pino-pretty` gibi modüllerin Next.js sunucu/tarayıcı ayrımında
  // doğru şekilde ele alınmasını sağlar. Bu, Wagmi konektörlerindeki yaygın uyarıları çözer.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        encoding: false, // MetaMask SDK uyarısını giderir
        'pino-pretty': false, // WalletConnect uyarısını giderir
      };
    }
    return config;
  },
};

export default nextConfig;
