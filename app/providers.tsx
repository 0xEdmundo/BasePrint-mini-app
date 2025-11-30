// app/providers.tsx
"use client";

import React from "react";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  // Şimdilik ekstra provider yok, sadece children dönüyoruz.
  // İleride React Query devtools vs. eklemek istersen buraya koyarız.
  return <>{children}</>;
}
