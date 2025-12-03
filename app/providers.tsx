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
      try {
        // Wait for SDK context to be available
        const context = await sdk.context;
        console.log('Farcaster SDK context loaded:', context);

        // Signal to the Farcaster/Base App client that the frame is ready
        sdk.actions.ready();
        console.log('SDK ready signal sent');

        setIsSDKLoaded(true);
      } catch (error) {
        console.error('Failed to load SDK context:', error);
        // Still mark as loaded to prevent blocking the UI
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
