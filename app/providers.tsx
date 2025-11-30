"use client";

import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";
import sdk from "@farcaster/frame-sdk";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  connectors: [
    coinbaseWallet({ appName: "BasePrint", preference: "smartWalletOnly" }),
    injected(),
  ],
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Signal to the Farcaster client that the frame is ready
      sdk.actions.ready();
    };

    // Call ready immediately on mount
    load();

    // Optional: You could wait for context here if needed
    setIsSDKLoaded(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
