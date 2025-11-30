'use client';

import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // Şimdilik ekstra provider yok, sadece çocukları döndürüyoruz.
  // Wagmi + QueryClient zaten app/page.tsx içinde wrap ediliyor.
  return <>{children}</>;
}
