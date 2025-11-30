"use client";

import React from "react";
import { MiniKitProvider } from "@coinbase/minikit-react";

const projectId = process.env.NEXT_PUBLIC_MINIKIT_PROJECT_ID!;
const appUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://baseprint.vercel.app";

export function Providers({ children }: { children: React.ReactNode }) {
  if (!projectId) {
    console.warn("Missing NEXT_PUBLIC_MINIKIT_PROJECT_ID env variable");
  }

  return (
    <MiniKitProvider
      config={{
        projectId,
        appUrl,
      }}
    >
      {children}
    </MiniKitProvider>
  );
}
