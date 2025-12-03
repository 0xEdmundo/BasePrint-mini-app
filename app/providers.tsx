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
        // Race between context and a timeout to ensure we always call ready()
        // Base App might not provide context immediately or at all in some states
        const contextPromise = sdk.context;
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1000));

        const result = await Promise.race([contextPromise, timeoutPromise]);

        if (result && (result as any).user) {
          console.log('Farcaster SDK context loaded:', result);
        } else {
          console.log('SDK context load timed out or empty, proceeding anyway');
        }

        // Signal to the Farcaster/Base App client that the frame is ready
        sdk.actions.ready();
        console.log('SDK ready signal sent');

        setIsSDKLoaded(true);
      } catch (error) {
        console.error('Failed to load SDK context:', error);
        // Ensure we still call ready even on error
        sdk.actions.ready();
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
