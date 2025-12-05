/** @type {import('next').NextConfig} */
const nextConfig = {
  // --- YENİ EKLENEN KISIM: Sunucu Bileşeni Dışlama ---
  // Bu ayar, belirli node_modules paketlerinin Next.js'in Sunucu Bileşenleri 
  // derlemesinden hariç tutulmasını sağlar, böylece `encoding` ve `pino-pretty`
  // gibi Node.js'e özgü bağımlılık uyarıları client bundle'da görünmez.
  experimental: {
    serverComponentsExternalPackages: ['@metamask/sdk', 'pino', 'encoding'],
  },
  // Allow ngrok and other dev origins
  allowedDevOrigins: ['*.ngrok-free.dev', '*.ngrok.io'],
  // ----------------------------------------------------

  // Bu ayar, client-side (tarayıcı) paketlemesi sırasında Node.js'e özgü modülleri
  // yok saymaya devam eder. (İlk yaptığımız çözüm)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        encoding: false, // MetaMask SDK uyarısını giderir
        'pino-pretty': false, // WalletConnect uyarısını giderir
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
