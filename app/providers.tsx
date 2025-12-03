"use client";

import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";
import sdk from "@farcaster/frame-sdk";
import { OnchainKitProvider } from '@coinbase/onchainkit';

const queryClient = new QueryClient();

const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  connectors: [
    coinbaseWallet({ appName: "BasePrint", preference: "all" }),
    injected(),
  ],
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      // 1. Call ready immediately to unblock Base App
      try {
        sdk.actions.ready();
        console.log('SDK ready signal sent immediately');
      } catch (err) {
        console.error('Failed to send immediate ready signal:', err);
      }

      // 2. Then load context for user data
      try {
        const context = await sdk.context;
        if (context && (context as any).user) {
          console.log('Farcaster SDK context loaded:', context);
        }
        setIsSDKLoaded(true);
      } catch (error) {
        console.error('Failed to load SDK context:', error);
        setIsSDKLoaded(true);
      }
    };

    load();
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider chain={base}>
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
