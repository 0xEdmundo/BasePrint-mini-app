"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useEnsName,
  type BaseError,
  WagmiProvider,
  createConfig,
  http,
} from "wagmi";
import { base } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseEther } from "viem";
import sdk from "@farcaster/frame-sdk";

// --- CONFIG ---

const CONTRACT_ADDRESS =
  "0x685Ea8972b1f3E63Ab7c8826f3B53CaCD4737bB2" as `0x${string}`;
const BASEPRINT_MINIAPP_URL =
  "https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  connectors: [
    injected(),
    coinbaseWallet({ appName: "BasePrint", preference: "smartWalletOnly" }),
  ],
});

// --- ICONS (aynen bıraktım) ---

const AppLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="50" cy="50" r="50" fill="#0052FF" />
    <path
      d="M50 20C33.4315 20 20 33.4315 20 50C20 66.5685 33.4315 80 50 80C66.5685 80 80 66.5685 80 50"
      stroke="white"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <path
      d="M50 35C41.7157 35 35 41.7157 35 50C35 58.2843 41.7157 65 50 65"
      stroke="white"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <circle cx="50" cy="50" r="4" fill="white" />
  </svg>
);

const FarcasterIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.24.24H5.76A5.76 5.76 0 0 0 0 6v12a5.76 5.76 0 0 0 5.76 5.76h12.48A5.76 5.76 0 0 0 24 18V6A5.76 5.76 0 0 0 18.24.24m.816 17.166v.504a.49.49 0 0 1 .543.48v.588a.49.49 0 0 1-.543.48H13.536a.49.49 0 0 1-.543-.48v-.294a.49.49 0 0 1 .543-.48h3.806v-.546h-5.47v.546h3.806a.49.49 0 0 1 .543.48v.294a.49.49 0 0 1-.543.48H10.464a.49.49 0 0 1-.543-.48v-.588a.49.49 0 0 1 .543-.48v-.504h3.536v-1.25a6.007 6.007 0 0 1-3.16-1.042V17.5a.49.49 0 0 1 .543.48v.588a.49.49 0 0 1-.543.48H6.312a.49.49 0 0 1-.543-.48v-.294a.49.49 0 0 1 .543-.48h2.062v-.546h-2.937v.546h2.062a.49.49 0 0 1 .543.48v.294a.49.49 0 0 1-.543.48H4.944a.49.49 0 0 1-.543-.48v-.588a.49.49 0 0 1 .543-.48v-.504h2.188c-.62-.43-1.134-.975-1.503-1.587a4.2 4.2 0 0 1-.397-1.164c-.033-.19-.047-.384-.047-.578 0-.84.225-1.636.623-2.333l.03-.047.016-.017.994-1.043.48.504-.993 1.043a4.05 4.05 0 0 0-.5 1.892c0 .248.03.492.083.729.123.542.387 1.037.753 1.45.67.755 1.63 1.229 2.705 1.229a3.67 3.67 0 0 0 3.12-1.74 3.65 3.65 0 0 0 .385-1.668c0-.62-.158-1.206-.437-1.724l-.017-.03-.03-.03-1.89-1.984.48-.504 1.89 1.983c.376.697.589 1.493.589 2.333 0 .194-.014.388-.047.578a4.2 4.2 0 0 1-.397 1.164 4.2 4.2 0 0 1-1.503 1.587h2.188z" />
  </svg>
);

// --- Farcaster cast link ---

const createFarcasterCastUrl = (username: string, isVerified: boolean) => {
  const verificationStatus = isVerified ? "✅ Verified" : "🔍 Unverified";

  const castText = `
Just minted my BasePrint ID on Base! 🚀

Username: @${username}
BasePrint Status: ${verificationStatus}

BasePrint turns your Farcaster reputation + Base onchain history into a single NFT identity card.

Mint yours directly from the mini-app 👇
${BASEPRINT_MINIAPP_URL}
`.trim();

  return (
    "https://warpcast.com/~/compose?text=" +
    encodeURIComponent(castText) +
    "&embeds[]=" +
    encodeURIComponent(BASEPRINT_MINIAPP_URL)
  );
};

// --- MAIN CONTENT ---

type FarcasterData = {
  username: string;
  pfp: string;
  score: number;
  fid: number;
  since: string;
} | null;

type Stats = {
  txCount: number;
  daysActive: number;
  longestStreak: number;
  bridge: number;
  defi: number;
  deployed: number;
  walletAge: number;
  isVerified: boolean;
} | null;

function BasePrintContent() {
  const { address, isConnected } = useAccount();
  const {
    connect,
    connectors,
    error: connectError,
    isPending: isConnectPending,
  } = useConnect();
  const { disconnect } = useDisconnect();
  const {
    writeContract,
    isPending,
    isSuccess,
    error: mintError,
  } = useWriteContract();
  const { data: ensName } = useEnsName({ address, chainId: base.id });

  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [userData, setUserData] = useState<FarcasterData>(null);
  const [stats, setStats] = useState<Stats>(null);

  // Farcaster SDK → splash kaldır
  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready();
      } catch (e) {
        console.log("Farcaster SDK Error:", e);
      } finally {
        setTimeout(() => setShowSplash(false), 1500);
      }
    };
    init();
  }, []);

  // API'den verileri çek
  const fetchData = useCallback(async () => {
    if (!address) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/baseprint?address=${address}`);
      if (!res.ok) {
        console.error("BasePrint API error", await res.text());
        setLoading(false);
        return;
      }

      const json = await res.json();
      setUserData(json.farcasterData);
      setStats(json.stats);
    } catch (err) {
      console.error("General Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected) {
      fetchData();
    } else {
      setUserData(null);
      setStats(null);
    }
  }, [isConnected, fetchData]);

  const handleMint = () => {
    if (!userData || !stats) return;
    const scoreInt = Math.floor((userData.score || 0) * 100);
    const dateStr = new Date().toISOString().split("T")[0];

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: [
        {
          name: "mintIdentity",
          type: "function",
          stateMutability: "payable",
          inputs: [
            { name: "_username", type: "string" },
            { name: "_score", type: "uint256" },
            { name: "_txCount", type: "uint256" },
            { name: "_daysActive", type: "uint256" },
            { name: "_mintDate", type: "string" },
          ],
          outputs: [],
        },
      ],
      functionName: "mintIdentity",
      args: [
        userData.username,
        BigInt(scoreInt),
        BigInt(stats.txCount),
        BigInt(stats.daysActive),
        dateStr,
      ],
      value: parseEther("0.0002"),
    });
  };

  const handleShare = () => {
    if (!userData || !stats) return;
    const shareUrl = createFarcasterCastUrl(userData.username, stats.isVerified);
    window.open(shareUrl, "_blank");
  };

  // --- RENDER ---

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#0052FF] flex flex-col items-center justify-center z-50 text-white">
        <div className="animate-bounce mb-6">
          <AppLogo className="w-24 h-24" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter">BasePrint</h1>
        <p className="text-blue-200 text-xs mt-2 font-mono tracking-widest">
          IDENTITY LAYER LOADING...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 relative">
        {/* HEADER */}
        <div className="bg-white/80 backdrop-blur-md p-4 flex justify-between items-center absolute top-0 w-full z-20">
          <div className="flex items-center gap-2">
            <AppLogo className="w-6 h-6" />
            <span className="font-bold text-slate-900 tracking-tight">
              BasePrint
            </span>
          </div>
          {isConnected && address && (
            <div className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded-full text-gray-500">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          )}
        </div>

        {/* NOT CONNECTED */}
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center h-[600px] bg-gradient-to-b from-blue-50 to-white">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
              <FarcasterIcon className="w-12 h-12 text-[#0052FF]" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              Connect Identity
            </h2>
            <p className="text-gray-500 text-sm text-center px-8 mb-4">
              Reveal your onchain reputation and Base activity.
            </p>

            <div className="w-full px-8">
              <button
                onClick={() => {
                  const preferred =
                    connectors.find((c) => c.id === "injected") ||
                    connectors[0];
                  connect({ connector: preferred });
                }}
                disabled={isConnectPending}
                className="w-full bg-[#0052FF] text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-600 transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mb-3"
              >
                {isConnectPending ? "Connecting..." : "Connect Wallet"}
              </button>

              {connectError && (
                <p className="text-[10px] text-red-500 text-center">
                  {(connectError as BaseError).shortMessage ||
                    (connectError as any).message}
                </p>
              )}
            </div>
          </div>
        ) : (
          // CONNECTED
          <div className="pt-16 pb-6 px-5 bg-slate-50 min-h-[600px] flex flex-col justify-between">
            {loading || !userData || !stats ? (
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="w-8 h-8 border-2 border-[#0052FF] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs text-slate-400 font-mono">
                  SCANNING BASE CHAIN...
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500">
                {/* CARD */}
                <div className="relative w-full aspect-[1.7/1] rounded-2xl overflow-hidden shadow-2xl group border border-white/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0052FF] via-[#0042cc] to-[#002980]"></div>
                  <div className="absolute -right-10 -bottom-20 w-60 h-60 bg-cyan-400 opacity-20 rounded-full blur-3xl"></div>
                  <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                    <AppLogo className="w-40 h-40 text-white" />
                  </div>

                  <div className="absolute inset-0 p-5 text-white flex flex-col justify-between z-10">
                    <div className="flex justify-between items-start">
                      <AppLogo className="w-8 h-8 drop-shadow-sm" />
                      {stats.isVerified && (
                        <div className="flex items-center gap-1.5 bg-blue-500/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-blue-400">
                          <svg
                            className="w-3.5 h-3.5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-[10px] font-bold uppercase tracking-wide">
                            Verified
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      <img
                        src={userData.pfp || "https://zora.co/assets/icon.png"}
                        className="w-16 h-16 rounded-full border-2 border-white shadow-lg bg-slate-800"
                        alt="pfp"
                      />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-blue-200 font-mono opacity-80 uppercase tracking-widest">
                          FID: {userData.fid}
                        </span>
                        <span className="text-2xl font-black tracking-tight leading-tight">
                          @{userData.username}
                        </span>
                        {ensName && (
                          <span className="text-xs text-white font-semibold bg-blue-600/50 px-2 py-0.5 rounded-md w-fit mt-1">
                            {ensName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] text-blue-200 font-bold uppercase">
                          Neynar Score
                        </span>
                        <span className="text-xl font-black leading-none">
                          {userData.score.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-300 to-green-500"
                          style={{ width: `${userData.score * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STATS GRID */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-sm">
                  <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                    <div className="p-3 text-center">
                      <div className="font-black text-slate-800 text-lg">
                        {stats.daysActive}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        Active Days
                      </div>
                    </div>
                    <div className="p-3 text-center">
                      <div className="font-black text-slate-800 text-lg">
                        {stats.walletAge}{" "}
                        <span className="text-xs text-gray-400 font-normal">
                          Days
                        </span>
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        Wallet Age
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                    <div className="p-3 text-center">
                      <div className="font-black text-slate-800 text-lg">
                        {stats.txCount}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        Total TXs
                      </div>
                    </div>
                    <div className="p-3 text-center">
                      <div className="font-black text-slate-800 text-lg">
                        {stats.bridge}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        Bridge TXs
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                    <div className="p-3 text-center">
                      <div className="font-black text-slate-800 text-lg">
                        {stats.defi}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-tight">
                        Lend/Borrow/Stake
                      </div>
                    </div>
                    <div className="p-3 text-center">
                      <div className="font-black text-slate-800 text-lg">
                        {stats.deployed}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                        Smart Contracts
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50/50 flex justify-between items-center px-6">
                    <span className="text-[10px] font-bold text-[#0052FF] uppercase tracking-wider">
                      Best Streak
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-base">🔥</span>
                      <span className="font-black text-[#0052FF] text-lg">
                        {stats.longestStreak} Days
                      </span>
                    </div>
                  </div>
                </div>

                {/* MINT / SHARE */}
                {isSuccess ? (
                  <button
                    onClick={handleShare}
                    className="w-full py-4 rounded-xl font-black text-lg text-white shadow-xl bg-purple-600 hover:bg-purple-700 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    SHARE ON WARPCAST
                  </button>
                ) : (
                  <button
                    disabled={isPending}
                    onClick={handleMint}
                    className="w-full py-4 rounded-xl font-black text-lg text-white shadow-xl shadow-blue-600/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 bg-[#0052FF] hover:bg-blue-700"
                  >
                    {isPending ? (
                      <span className="animate-pulse">Processing...</span>
                    ) : (
                      <>
                        <span>MINT BASEPRINT</span>
                        <span className="bg-white/20 text-xs px-2 py-1 rounded font-medium">
                          0.0002 ETH
                        </span>
                      </>
                    )}
                  </button>
                )}

                {mintError && (
                  <div className="bg-red-50 text-red-500 text-[10px] text-center p-2 rounded-lg border border-red-100">
                    {(mintError as BaseError).shortMessage ||
                      (mintError as any).message}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// WRAPPER
export default function Page() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BasePrintContent />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
