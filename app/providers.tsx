"use client";

import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { farcasterFrame } from "@farcaster/miniapp-wagmi-connector";
import { coinbaseWallet, injected } from "wagmi/connectors";
import sdk from "@farcaster/frame-sdk";
import { OnchainKitProvider } from '@coinbase/onchainkit';

const queryClient = new QueryClient();

// Connectors:
// - farcasterFrame: for Warpcast/Base App
// - injected: for MetaMask, Rabby, OKX, etc. (browser extensions)
// - coinbaseWallet: Coinbase Wallet app/extension
const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  connectors: [
    farcasterFrame(),
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: "BasePrint", preference: "all" }),
  ],
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      // 1. First check if we're in Farcaster context
      try {
        const context = await sdk.context;
        if (context && (context as any).user) {
          console.log('Farcaster SDK context loaded:', context);
          // Log client information for debugging
          if ((context as any).client) {
            console.log('Client info:', (context as any).client);
          }
          // 2. Only call ready() if we're in Farcaster context
          Promise.resolve(sdk.actions.ready()).catch((e) => {
            console.log('SDK ready() handled error:', e);
          });
        } else {
          console.log('Not in Farcaster context, skipping SDK actions');
        }
        setIsSDKLoaded(true);
      } catch (error) {
        console.log('SDK context not available (web browser):', error);
        setIsSDKLoaded(true);
      }
    };

    load();
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          chain={base}
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
