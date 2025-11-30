"use client";

import React from "react";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  // Şimdilik ekstra global provider yok, ileride eklemek istersen buraya koyarız
  return <>{children}</>;
}
