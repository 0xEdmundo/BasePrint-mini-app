'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useEnsName,
  type BaseError,
} from 'wagmi';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected, coinbaseWallet } from 'wagmi/connectors';
import { parseEther } from 'viem';

// --- 1. CONFIG & API KEYS ---
const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '';
const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || '';
const CONTRACT_ADDRESS = '0x685Ea8972b1f3E63Ab7c8826f3B53CaCD4737bB2';
const BASE_APP_URL = "https://baseprint.vercel.app"; // Proje URL'niz

// --- 2. WAGMI SETUP ---
const queryClient = new QueryClient();

const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
  connectors: [
    coinbaseWallet({ appName: 'BasePrint', preference: 'smartWalletOnly' }),
    injected(),
  ],
});

// --- 3. ICONS ---
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

// --- 4. LOGIC ---
const calculateStreak = (uniqueDates: string[]) => {
  if (!uniqueDates.length) return 0;
  const sortedDates = [...uniqueDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  let longestStreak = 1;
  let currentStreak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const d1 = new Date(sortedDates[i]);
    const d2 = new Date(sortedDates[i+1]);
    const diffTime = Math.abs(d1.getTime() - d2.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays === 1) {
      currentStreak++;
    } else {
      if (currentStreak > longestStreak) longestStreak = currentStreak;
      currentStreak = 1;
    }
  }
  if (currentStreak > longestStreak) longestStreak = currentStreak;
  return longestStreak;
};

const calculateWalletAgeDays = (firstTxTimestamp: number) => {
  if (!firstTxTimestamp) return 0;
  const now = new Date().getTime();
  const firstDate = new Date(firstTxTimestamp * 1000).getTime();
  const diffTime = Math.abs(now - firstDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const analyzeTransactions = (txs: any[]) => {
  let bridge = 0, deployed = 0, interactions = 0;
  txs.forEach((tx: any) => {
    if (!tx.to || tx.to === '') { deployed++; return; }
    const method = tx.methodId || (tx.input && tx.input.length >= 10 ? tx.input.substring(0, 10) : null);
    if (method && method !== '0x') {
      interactions++;
      if (['0x32b7006d', '0x49228978', '0x5cae9c06', '0x9a2ac9d9'].includes(method)) bridge++;
    }
  });
  const defi = Math.max(0, Math.floor((interactions - bridge) * 0.4));
  return { bridge, defi, deployed };
};

// YENİ: Farcaster Paylaşım Linki Oluşturucu
const createFarcasterCastUrl = (username: string, tokenId: string, isVerified: boolean) => {
    // NFT'nin metadata API linki (görsel/embed için)
    // Token ID varsa onu kullan, yoksa genel görsel
    const nftMetadataUrl = tokenId ? `${BASE_APP_URL}/api/token/${tokenId}` : BASE_APP_URL; 
    
    const verificationStatus = isVerified ? "✅ Verified" : "🔍 Unverified";
    
    const castText = `Just minted my BasePrint Identity! 🚀\n\nUsername: @${username}\nBase Status: ${verificationStatus}\n\nMint your BasePrint NFT and prove your onchain identity on Base!\n\n#BasePrint #Base #Farcaster`;
    return `https://warpcast.com/~/compose?text=${encodeURIComponent(castText.trim())}&embeds[]=${nftMetadataUrl}`;
};

// --- 5. MAIN COMPONENT ---
function BasePrintContent() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContract, isPending, isSuccess, error: mintError } = useWriteContract();
  const { data: ensName } = useEnsName({ address, chainId: base.id });

  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  
  // YENİ: Mint edilen Token ID'yi simüle etmek için state (Gerçek uygulamada Event dinlenmeli)
  const [mintedTokenId, setMintedTokenId] = useState<string>("");

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = useCallback(async () => {
    if (!address) return;
    setLoading(true);

    try {
      // A. NEYNAR
      // Varsayılan değerler (Hata durumunda gösterilecek)
      let farcasterData = { username: "Explorer", pfp: "", score: 0, fid: 0, since: "2024" };
      
      if (NEYNAR_API_KEY) {
        try {
            const neynarRes = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=&viewer_fid=3&addresses=${address}`, {
                headers: { 'api_key': NEYNAR_API_KEY, 'accept': 'application/json' }
            });
            const neynarJson = await neynarRes.json();
            if (neynarJson.users && neynarJson.users[0]) {
                const u = neynarJson.users[0];
                farcasterData = {
                    username: u.username,
                    pfp: u.pfp_url,
                    score: u.score || 0.5,
                    fid: u.fid,
                    since: u.created_at ? new Date(u.created_at).getFullYear().toString() : "2024"
                };
            }
        } catch (e) { console.log("Neynar Error (Skipping):", e); }
      }

      // B. ETHERSCAN V2
      if (ETHERSCAN_API_KEY) {
        try {
            const txUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
            const txRes = await fetch(txUrl);
            const txJson = await txRes.json();
            
            const balUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
            const balRes = await fetch(balUrl);
            const balJson = await balRes.json();

            if (txJson.result && Array.isArray(txJson.result)) {
                const txs = txJson.result;
                const uniqueDates = Array.from(new Set(txs.map((tx: any) => new Date(parseInt(tx.timeStamp) * 1000).toDateString()))) as string[];
                
                const analysis = analyzeTransactions(txs);
                const isVerified = txs.length > 5 && parseInt(balJson.result) > 0;

                setStats({
                    txCount: txs.length,
                    daysActive: uniqueDates.length,
                    longestStreak: calculateStreak(uniqueDates),
                    bridge: analysis.bridge,
                    defi: analysis.defi,
                    deployed: analysis.deployed,
                    walletAge: calculateWalletAgeDays(parseInt(txs[0]?.timeStamp || 0)),
                    isVerified: isVerified
                });
            }
        } catch (e) { console.log("Etherscan Error (Skipping):", e); }
      }
      setUserData(farcasterData);
    } catch (error) { console.error("General Fetch Error:", error); } 
    finally { setLoading(false); }
  }, [address]);

  useEffect(() => {
    if (isConnected) fetchData();
  }, [isConnected, address, fetchData]);

  const handleMint = () => {
    if (!userData || !stats) return;
    const scoreInt = Math.floor((userData.score || 0) * 100);
    const dateStr = new Date().toISOString().split('T')[0];

    writeContract({
        address: CONTRACT_ADDRESS,
        abi: [{
                name: 'mintIdentity',
                type: 'function',
                stateMutability: 'payable',
                inputs: [
                    { name: '_username', type: 'string' },
                    { name: '_score', type: 'uint256' },
                    { name: '_txCount', type: 'uint256' },
                    { name: '_daysActive', type: 'uint256' },
                    { name: '_mintDate', type: 'string' }
                ],
                outputs: []
            }],
        functionName: 'mintIdentity',
        args: [userData.username, BigInt(scoreInt), BigInt(stats.txCount), BigInt(stats.daysActive), dateStr],
        value: parseEther('0.0002')
    });
  };
  
  // YENİ: Paylaşım Butonu İşlevi
  const handleShare = () => {
      if (!userData || !stats) return;
      const shareUrl = createFarcasterCastUrl(userData.username, '', stats.isVerified);
      window.open(shareUrl, '_blank');
  };

  // --- RENDER ---
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#0052FF] flex flex-col items-center justify-center z-50 text-white">
        <div className="animate-bounce mb-6"><AppLogo className="w-24 h-24" /></div>
        <h1 className="text-3xl font-black tracking-tighter">BasePrint</h1>
        <p className="text-blue-200 text-xs mt-2 font-mono tracking-widest">IDENTITY LAYER LOADING...</p>
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
                <span className="font-bold text-slate-900 tracking-tight">BasePrint</span>
            </div>
            {isConnected && <div className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded-full text-gray-500">{address?.slice(0,6)}...{address?.slice(-4)}</div>}
        </div>

        {!isConnected ? (
            <div className="flex flex-col items-center justify-center h-[600px] bg-gradient-to-b from-blue-50 to-white">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
                    <FarcasterIcon className="w-12 h-12 text-[#0052FF]" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Connect Identity</h2>
                <p className="text-gray-500 text-sm text-center px-8 mb-8">Reveal your onchain reputation and Base activity.</p>
                
                <div className="w-full px-8">
                    {/* Akıllı Cüzdan Bağlantısı */}
                    <button 
                        onClick={() => {
                            // Farcaster içindeyse injected (Warpcast) kullanır
                            // Değilse Coinbase Wallet (Smart Wallet) açar
                            const preferredConnector = connectors.find(c => c.id === 'injected') || connectors[0];
                            connect({ connector: preferredConnector });
                        }} 
                        className="w-full bg-[#0052FF] text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-600 transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mb-3"
                    >
                         Connect Wallet
                    </button>
                </div>
            </div>
        ) : (
            <div className="pt-16 pb-6 px-5 bg-slate-50 min-h-[600px] flex flex-col justify-between">
                
                {loading || !userData || !stats ? (
                    <div className="flex flex-col items-center justify-center flex-1">
                        <div className="w-8 h-8 border-2 border-[#0052FF] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-xs text-slate-400 font-mono">SCANNING BASE CHAIN...</p>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500">
                        
                        {/* --- GLASS CARD --- */}
                        <div className="relative w-full aspect-[1.7/1] rounded-2xl overflow-hidden shadow-2xl group border border-white/20">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#0052FF] via-[#0042cc] to-[#002980]"></div>
                            <div className="absolute -right-10 -bottom-20 w-60 h-60 bg-cyan-400 opacity-20 rounded-full blur-3xl"></div>
                            <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12"><AppLogo className="w-40 h-40 text-white" /></div>

                            <div className="absolute inset-0 p-5 text-white flex flex-col justify-between z-10">
                                <div className="flex justify-between items-start">
                                    <AppLogo className="w-8 h-8 drop-shadow-sm" />
                                    {stats.isVerified && (
                                        <div className="flex items-center gap-1.5 bg-blue-500/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-blue-400">
                                            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                                            <span className="text-[10px] font-bold uppercase tracking-wide">Verified</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 mt-2">
                                    <img src={userData.pfp || "https://zora.co/assets/icon.png"} className="w-16 h-16 rounded-full border-2 border-white shadow-lg bg-slate-800" alt="pfp" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-blue-200 font-mono opacity-80 uppercase tracking-widest">FID: {userData.fid}</span>
                                        <span className="text-2xl font-black tracking-tight leading-tight">@{userData.username}</span>
                                        {ensName && <span className="text-xs text-white font-semibold bg-blue-600/50 px-2 py-0.5 rounded-md w-fit mt-1">{ensName}</span>}
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] text-blue-200 font-bold uppercase">Neynar Score</span>
                                        <span className="text-xl font-black leading-none">{userData.score.toFixed(2)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-green-300 to-green-500" style={{ width: `${userData.score * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* --- STATS GRID --- */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-sm">
                            <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                                <div className="p-3 text-center">
                                    <div className="font-black text-slate-800 text-lg">{stats.daysActive}</div>
                                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Active Days</div>
                                </div>
                                <div className="p-3 text-center">
                                    <div className="font-black text-slate-800 text-lg">{stats.walletAge} <span className="text-xs text-gray-400 font-normal">Days</span></div>
                                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Wallet Age</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                                <div className="p-3 text-center">
                                    <div className="font-black text-slate-800 text-lg">{stats.txCount}</div>
                                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total TXs</div>
                                </div>
                                <div className="p-3 text-center">
                                    <div className="font-black text-slate-800 text-lg">{stats.bridge}</div>
                                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Bridge TXs</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                                <div className="p-3 text-center">
                                    <div className="font-black text-slate-800 text-lg">{stats.defi}</div>
                                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider leading-tight">Lend/Borrow/Stake</div>
                                </div>
                                <div className="p-3 text-center">
                                    <div className="font-black text-slate-800 text-lg">{stats.deployed}</div>
                                    <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Smart Contracts</div>
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50/50 flex justify-between items-center px-6">
                                <span className="text-[10px] font-bold text-[#0052FF] uppercase tracking-wider">Best Streak</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-base">🔥</span>
                                    <span className="font-black text-[#0052FF] text-lg">{stats.longestStreak} Days</span>
                                </div>
                            </div>
                        </div>

                        {/* --- MINT & SHARE BUTTONS --- */}
                        {isSuccess ? (
                             <button
                                onClick={handleShare}
                                className="w-full py-4 rounded-xl font-black text-lg text-white shadow-xl bg-purple-600 hover:bg-purple-700 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm-1-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm5 7h-2v-6h2v6zm-1-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
                                </svg>
                                SHARE ON WARPCAST
                            </button>
                        ) : (
                            <button
                                disabled={isPending}
                                onClick={handleMint}
                                className={`w-full py-4 rounded-xl font-black text-lg text-white shadow-xl shadow-blue-600/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2
                                    ${'bg-[#0052FF] hover:bg-blue-700'}`}
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
                                {(mintError as BaseError).shortMessage || mintError.message}
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

// 5. MAIN WRAPPER
export default function Page() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BasePrintContent />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
