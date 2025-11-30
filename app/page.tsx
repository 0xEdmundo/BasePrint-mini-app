"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useConnect,
  useWriteContract,
  useEnsName,
  type BaseError,
} from "wagmi";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseEther } from "viem";
import { sdk } from "@farcaster/miniapp-sdk";

// CONFIG ------------------

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

// SVG LOGOS ------------------

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

// SHARE URL ------------------

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

// MAIN ------------------

function BasePrintContent() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { writeContract, isPending, isSuccess, error: mintError } =
    useWriteContract();

  useEnsName({ address, chainId: base.id });

  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // 🔵 SPLASH + MINI APP READY -----------------------
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp().catch(() => false);
        if (inMiniApp) {
          await sdk.actions.ready();
        }
      } catch (err) {
        console.error("MiniApp sdk init error:", err);
      } finally {
        if (!cancelled) setShowSplash(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // FETCH DATA -----------------------
  const fetchData = useCallback(async () => {
    if (!address) {
      return;
    }

    setLoading(true);
    setProfileError(null);

    try {
      const res = await fetch(`/api/baseprint?address=${address}`);

      if (!res.ok) {
        if (res.status === 404) {
          setUserData(null);
          setStats(null);
          setProfileError(
            "No Farcaster profile found for this address. Make sure your wallet is linked."
          );
          return;
        }

        console.error("BasePrint API error:", res.status);
        setUserData(null);
        setStats(null);
        setProfileError("Unexpected server error. Please try again.");
        return;
      }

      const json = await res.json();
      console.log("BasePrint API response:", json);

      setUserData(json.farcasterData);
      setStats(json.stats);
    } catch (e) {
      console.error("BasePrint API network error:", e);
      setUserData(null);
      setStats(null);
      setProfileError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected) fetchData();
  }, [isConnected, fetchData]);

  // MINT -----------------------

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

  // SHARE ------------------

  const handleShare = () => {
    if (!userData || !stats) return;
    const url = createFarcasterCastUrl(userData.username, stats.isVerified);
    window.open(url, "_blank");
  };

  // RENDER -----------------------

  // 🔵 Eski mavi logolu splash
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
        {!isConnected ? (
          // ------------------- WALLET NOT CONNECTED -------------------
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
                className="w-full bg-[#0052FF] text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-600 transition shadow-lg"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        ) : (
          // --------------------- CONNECTED ---------------------
          <div className="pt-16 pb-6 px-5 bg-slate-50 min-h-[600px] flex flex-col justify-between">
            {loading ? (
              // Sadece loading TRUE iken spinner
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="w-8 h-8 border-2 border-[#0052FF] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs text-slate-400 font-mono">
                  SCANNING BASE CHAIN...
                </p>
              </div>
            ) : profileError ? (
              // API hata / profil yok
              <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
                <p className="text-red-500 font-semibold mb-2">
                  {profileError}
                </p>
                <button
                  onClick={fetchData}
                  className="mt-2 bg-[#0052FF] text-white px-6 py-3 rounded-xl font-bold text-sm"
                >
                  Retry
                </button>
              </div>
            ) : !userData || !stats ? (
              // Güvenlik için fallback (hiç veri yok ama loading de değilse)
              <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
                <p className="text-slate-500 text-sm mb-2">
                  No data received yet.
                </p>
                <button
                  onClick={fetchData}
                  className="mt-2 bg-[#0052FF] text-white px-6 py-3 rounded-xl font-bold text-sm"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <>
                {/* CARD ------------------------- */}
                <div className="relative w-full aspect-[1.7/1] rounded-2xl overflow-hidden shadow-2xl group border border-white/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0052FF] via-[#0042cc] to-[#002980]"></div>
                  <div className="absolute inset-0 p-5 text-white flex flex-col justify-between z-10">
                    {/* TOP */}
                    <div className="flex justify-between items-start">
                      <AppLogo className="w-8 h-8 drop-shadow-sm" />
                      {stats.isVerified && (
                        <div className="flex items-center gap-1 bg-blue-600/80 px-3 py-1 rounded-full backdrop-blur border border-blue-400">
                          <span className="text-xs">Verified</span>
                        </div>
                      )}
                    </div>

                    {/* USER INFO */}
                    <div className="flex items-center gap-4 mt-2">
                      <img
                        src={userData.pfp || "https://zora.co/assets/icon.png"}
                        className="w-16 h-16 rounded-full border-2 border-white shadow-lg bg-slate-800"
                      />
                      <div>
                        <div className="text-[10px] text-blue-200 font-mono uppercase">
                          FID: {userData.fid}
                        </div>
                        <div className="text-2xl font-black">
                          @{userData.username}
                        </div>
                      </div>
                    </div>

                    {/* SCORE */}
                    <div className="mt-3">
                      <div className="flex justify-between text-blue-200 text-[10px] uppercase">
                        <span>Neynar Score</span>
                        <span>{userData.score.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/20 rounded mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-green-300 to-green-500"
                          style={{ width: `${userData.score * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* STATS GRID --------------------- */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-sm mt-4">
                  <div className="grid grid-cols-2 divide-x divide-gray-100 border-b">
                    <Item label="Active Days" value={stats.daysActive} />
                    <Item
                      label="Wallet Age"
                      value={`${stats.walletAge} Days`}
                    />
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-100 border-b">
                    <Item label="Total TXs" value={stats.txCount} />
                    <Item label="Bridge TXs" value={stats.bridge} />
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-100 border-b">
                    <Item label="Lend/Borrow/Stake" value={stats.defi} />
                    <Item label="Smart Contracts" value={stats.deployed} />
                  </div>
                  <div className="p-3 bg-blue-50 text-center font-black text-[#0052FF]">
                    🔥 Best Streak: {stats.longestStreak} Days
                  </div>
                </div>

                {/* MINT ------------------------ */}
                {!isSuccess ? (
                  <button
                    onClick={handleMint}
                    disabled={isPending}
                    className="w-full mt-4 bg-[#0052FF] text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-blue-700"
                  >
                    {isPending
                      ? "Processing..."
                      : "MINT BASEPRINT • 0.0002 ETH"}
                  </button>
                ) : (
                  <button
                    onClick={handleShare}
                    className="w-full mt-4 bg-purple-600 text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-purple-700"
                  >
                    SHARE ON WARPCAST
                  </button>
                )}

                {mintError && (
                  <div className="text-red-500 text-xs text-center mt-2">
                    {(mintError as BaseError).shortMessage ||
                      (mintError as any).message}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-3 text-center">
      <div className="font-black text-slate-800 text-lg">{value}</div>
      <div className="text-[9px] text-gray-400 font-bold uppercase">
        {label}
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
