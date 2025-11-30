/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bu ayar, Next.js'in client-side (tarayıcı) paketlemesi sırasında
  // Node.js'e özgü modülleri görmezden gelmesini sağlar.
  // Bu, Wagmi/MetaMask SDK'dan kaynaklanan "Module not found" uyarılarını çözer.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        encoding: false, // MetaMask SDK uyarısını giderir
        'pino-pretty': false, // WalletConnect uyarısını giderir
        fs: false,       // Dosya sistemi modülü (Sunucuya özgü)
        net: false,      // Ağ modülü (Sunucuya özgü)
        tls: false,      // TLS/SSL modülü (Sunucuya özgü)
        crypto: false,   // Bazı WalletConnect/Wagmi sürümleri için gerekebilir
      };
    }
    return config;
  },
};

export default nextConfig;
