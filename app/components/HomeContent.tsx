"use client";

import { Name } from '@coinbase/onchainkit/identity';
import { base } from 'wagmi/chains';
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract, useSwitchChain, type BaseError } from 'wagmi';
import { parseEther } from 'viem';
import sdk from '@farcaster/frame-sdk';



// --- 1. CONFIG & API KEYS ---
const CONTRACT_ADDRESS = '0x66fADf7f93A4407DD336C35cD09ccDA58559442b';

// --- 2. ICONS ---
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

// --- 3. MAIN COMPONENT ---
export default function HomeContent() {
    const { address, isConnected } = useAccount();
    const { connect, connectors } = useConnect();
    const { disconnect } = useDisconnect();
    const {
        writeContract,
        isPending,
        isSuccess,
        error: mintError,
    } = useWriteContract();

    const [loading, setLoading] = useState(false);
    const [showSplash, setShowSplash] = useState(true);
    const [userData, setUserData] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [basename, setBasename] = useState<string | null>(null);
    const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);

    // Initialize Farcaster SDK and handle splash
    useEffect(() => {
        const init = async () => {
            const context = await sdk.context;
            if (context?.user) {
                console.log('Farcaster Context User:', context.user);
            }
            setTimeout(() => setShowSplash(false), 1500);
        };
        init();
    }, []);

    // --- DEBUG LOGGING ---
    const [logs, setLogs] = useState<string[]>([]);
    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    const fetchData = useCallback(async () => {
        if (!address) return;
        setLoading(true);
        addLog(`Fetching data for ${address.slice(0, 6)}...`);

        try {
            // 1. NEYNAR (FARCASTER USER)
            let farcasterData = {
                username: 'Explorer',
                pfp: '',
                score: 0.5,
                fid: 0,
                since: '2024',
                isVerified: false,
            };

            try {
                const neynarRes = await fetch(`/api/neynar?address=${address}`);
                if (neynarRes.ok) {
                    const data = await neynarRes.json();
                    farcasterData = data;
                    addLog('Neynar success');
                } else {
                    addLog(`Neynar failed: ${neynarRes.status}`);
                }
            } catch (e) {
                addLog(`Neynar error: ${e}`);
            }

            // 2. ETHERSCAN (ONCHAIN STATS)
            let statsData = {
                txCount: 0,
                daysActive: 0,
                longestStreak: 0,
                currentStreak: 0,
                bridgeToEth: 0,
                bridgeFromEth: 0,
                bridge: 0,
                defiLend: 0,
                defiBorrow: 0,
                defiSwap: 0,
                defiStake: 0,
                defi: 0,
                deployed: 0,
                walletAge: 0,
                isVerified: false,
            };

            try {
                const etherscanRes = await fetch(`/api/etherscan?address=${address}`, { cache: 'no-store' });
                if (etherscanRes.ok) {
                    const data = await etherscanRes.json();
                    addLog(`Etherscan Raw: ${JSON.stringify(data).slice(0, 100)}`); // Debug full JSON
                    if (data.txCount !== undefined) {
                        statsData = {
                            ...data,
                            // Backward compatibility: calculate totals
                            bridge: (data.bridgeToEth || 0) + (data.bridgeFromEth || 0),
                            defi: (data.defiLend || 0) + (data.defiBorrow || 0) + (data.defiSwap || 0) + (data.defiStake || 0),
                        };
                        addLog(`Etherscan success: TXs=${data.txCount}`);
                    } else {
                        addLog('Etherscan data missing txCount');
                    }
                } else {
                    const errText = await etherscanRes.text();
                    addLog(`Etherscan failed: ${etherscanRes.status} - ${errText.slice(0, 50)}`);
                }
            } catch (e) {
                addLog(`Etherscan error: ${e}`);
            }

            // 3. BASENAME
            try {
                const basenameRes = await fetch(`/api/basename?address=${address}`, { cache: 'no-store' });
                if (basenameRes.ok) {
                    const data = await basenameRes.json();
                    addLog(`Basename Raw: ${JSON.stringify(data)}`);
                    setBasename(data.basename);
                } else {
                    setBasename(null);
                }
            } catch (e) {
                addLog(`Basename error: ${e}`);
                setBasename(null);
            }

            setStats(statsData);
            setUserData(farcasterData);

        } catch (error) {
            addLog(`Global fetch error: ${error}`);
            // Set default values on error so UI doesn't hang
            setUserData({
                username: 'Explorer',
                pfp: '',
                score: 0.5,
                fid: 0,
                since: '2024',
                isVerified: false,
            });
            setStats({
                txCount: 0,
                daysActive: 0,
                longestStreak: 0,
                currentStreak: 0,
                bridgeToEth: 0,
                bridgeFromEth: 0,
                bridge: 0,
                defiLend: 0,
                defiBorrow: 0,
                defiSwap: 0,
                defiStake: 0,
                defi: 0,
                deployed: 0,
                walletAge: 0,
                isVerified: false,
            });
        } finally {
            setLoading(false);
        }
    }, [address]);

    useEffect(() => {
        if (isConnected) fetchData();
    }, [isConnected, address, fetchData]);

    const { switchChain } = useSwitchChain();
    const { chain } = useAccount();

    const handleMint = async () => {
        addLog('Mint button clicked');

        if (!userData || !stats) {
            addLog('Mint aborted: Missing data');
            return;
        }

        // Enforce Base Network
        if (chain?.id !== base.id) {
            addLog('Wrong network. Switching to Base...');
            switchChain({ chainId: base.id });
            return;
        }

        try {
            const scoreInt = Math.floor((userData.score || 0) * 100);
            const dateStr = new Date().toISOString().split('T')[0];

            // Safe BigInt conversion with fallbacks
            const txCount = stats.txCount ? BigInt(stats.txCount) : 0n;
            const daysActive = stats.daysActive ? BigInt(stats.daysActive) : 0n;

            // Read nextTokenId before minting to know which token will be minted
            const { createPublicClient, http } = await import('viem');
            const client = createPublicClient({
                chain: base,
                transport: http(),
            });

            const nextTokenId = await client.readContract({
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: [
                    {
                        name: 'nextTokenId',
                        type: 'function',
                        stateMutability: 'view',
                        inputs: [],
                        outputs: [{ type: 'uint256' }],
                    },
                ],
                functionName: 'nextTokenId',
            }) as bigint;

            addLog(`Minting: ${userData.username}, Score=${scoreInt}, TX=${txCount}, TokenID will be: ${nextTokenId}`);

            writeContract({
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: [
                    {
                        name: 'mintIdentity',
                        type: 'function',
                        stateMutability: 'payable',
                        inputs: [
                            { name: '_username', type: 'string' },
                            { name: '_score', type: 'uint256' },
                            { name: '_txCount', type: 'uint256' },
                            { name: '_daysActive', type: 'uint256' },
                            { name: '_mintDate', type: 'string' },
                        ],
                        outputs: [],
                    },
                ],
                functionName: 'mintIdentity',
                args: [
                    userData.username,
                    BigInt(scoreInt),
                    txCount,
                    daysActive,
                    dateStr,
                ],
                value: parseEther('0.0002'),
                chainId: base.id, // Explicitly set chainId
            });

            // Store the token ID that will be minted
            setMintedTokenId(nextTokenId.toString());
        } catch (err) {
            console.error('Mint Error:', err);
            addLog(`Mint Error: ${err}`);
        }
    };

    // Share on Farcaster
    const handleShareOnFarcaster = () => {
        if (!mintedTokenId) return;

        const shareUrl = `https://baseprint.vercel.app/id/${mintedTokenId}`;
        const castText = `Just minted my BasePrint ID! 🎨\n\n`;

        // Open Warpcast composer with the share URL
        const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(shareUrl)}`;

        sdk.actions.openUrl(warpcastUrl);
    };

    // Set the base metadata URI (owner only)
    const handleSetBaseURI = () => {
        writeContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: [
                {
                    name: 'setBaseURI',
                    type: 'function',
                    stateMutability: 'nonpayable',
                    inputs: [{ name: '_newBaseURI', type: 'string' }],
                    outputs: [],
                },
            ],
            functionName: 'setBaseURI',
            args: ['https://baseprint.vercel.app/api/metadata/'],
        });
    };

    const handleShare = () => {
        if (!userData || !stats) return;

        // Construct the Mini App URL with query params to generate the correct OG image
        const baseUrl = 'https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint';
        const params = new URLSearchParams({
            username: userData.username,
            pfp: userData.pfp || '',
            fid: userData.fid.toString(),
            score: userData.score.toString(),
            isVerified: userData.isVerified ? 'true' : 'false',
            txCount: stats.txCount.toString(),
            daysActive: stats.daysActive.toString(),
            walletAge: stats.walletAge.toString(),
            bridge: stats.bridge.toString(),
            defi: stats.defi.toString(),
            deployed: stats.deployed.toString(),
            streak: stats.longestStreak.toString(),
            basename: basename || ''
        });

        const embedUrl = `${baseUrl}?${params.toString()}`;

        const text = `Just minted my BasePrint ID — a snapshot of my Farcaster presence, Neynar score, and wallet activity.\nIt’s like a personal onchain profile you can actually own.\n\nCheck your own card, explore your data, and mint it if you like what you see:`;

        const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(embedUrl)}`;

        sdk.actions.openUrl(shareUrl);
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
                    {isConnected && (
                        <div className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded-full text-gray-500">
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                        </div>
                    )}
                </div>

                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center h-[600px] bg-gradient-to-b from-blue-50 to-white">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 overflow-hidden">
                            <img src="/farcaster-icon.png" alt="Farcaster" className="w-full h-full object-cover" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">
                            Connect Identity
                        </h2>
                        <p className="text-gray-500 text-sm text-center px-8 mb-8">
                            Reveal your onchain reputation and Base activity.
                        </p>

                        <div className="w-full px-8">
                            <button
                                onClick={() => {
                                    const preferredConnector =
                                        connectors.find((c) => c.id === 'coinbaseWalletSDK') ||
                                        connectors[0];
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
                                <p className="text-xs text-slate-400 font-mono">
                                    SCANNING BASE CHAIN...
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500">
                                {/* --- GLASS CARD (REVISED) --- */}
                                <div className="relative w-full aspect-[1.7/1] rounded-2xl overflow-hidden shadow-2xl group border border-white/20">
                                    {/* Arkaplan */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#0052FF] via-[#0042cc] to-[#002980]"></div>
                                    <div className="absolute -right-10 -bottom-20 w-60 h-60 bg-cyan-400 opacity-20 rounded-full blur-3xl"></div>
                                    <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                                        <AppLogo className="w-40 h-40 text-white" />
                                    </div>

                                    {/* İçerik */}
                                    <div className="absolute inset-0 p-5 text-white flex flex-col justify-between z-10">

                                        {/* YENİ PROFİL DÜZENİ: Resim Solda, Bilgiler Sağda */}
                                        <div className="flex items-start gap-4">
                                            {/* SOL: Profil Resmi */}
                                            <div className="relative">
                                                <img
                                                    src={userData.pfp || 'https://zora.co/assets/icon.png'}
                                                    className="w-20 h-20 rounded-full border-2 border-white shadow-lg bg-slate-800 object-cover"
                                                    alt="pfp"
                                                />
                                                {/* Verified Badge Resmin Üzerinde (Opsiyonel) veya Yanında */}
                                                {userData.isVerified && (
                                                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border border-white">
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>

                                            {/* SAĞ: Bilgiler */}
                                            <div className="flex flex-col flex-1 min-w-0">
                                                {/* 1. FID (En Üst) */}
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-blue-200 font-mono opacity-80 uppercase tracking-widest">
                                                        FID: {userData.fid}
                                                    </span>
                                                    <AppLogo className="w-6 h-6 opacity-80" />
                                                </div>

                                                {/* 2. Display Name (Kalın) */}
                                                <h3 className="text-xl font-black tracking-tight leading-tight truncate mt-1">
                                                    {userData.username}
                                                </h3>

                                                {/* 3. Handle (@username) */}
                                                <span className="text-xs text-blue-200 font-medium truncate">
                                                    @{userData.username}
                                                </span>

                                                {/* 4. Basename (En Alt) */}
                                                {/* 4. Basename (En Alt) */}
                                                <div className="mt-2">
                                                    <div className="text-[10px] font-bold text-[#0052FF] bg-white px-2 py-0.5 rounded-full inline-block shadow-sm">
                                                        <Name address={address} chain={base} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Neynar Score Bar */}
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

                                {/* --- STATS GRID --- */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-sm">
                                    {/* Row 1: Active Days | Wallet Age */}
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
                                                {stats.walletAge}{' '}
                                                <span className="text-xs text-gray-400 font-normal">
                                                    Days
                                                </span>
                                            </div>
                                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                                Wallet Age
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 2: Total TXs | Bridge TXs */}
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

                                    {/* Row 3: Lend/Borrow | Smart Contracts */}
                                    <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                                        <div className="p-3 text-center">
                                            <div className="font-black text-slate-800 text-lg">
                                                {stats.defi}
                                            </div>
                                            <div className="flex flex-col items-center justify-center leading-none mt-1">
                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                                    Lend/Borrow
                                                </span>
                                                <span className="text-[8px] text-gray-300 font-bold uppercase tracking-wider">
                                                    Swap/Stake
                                                </span>
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

                                    {/* Row 4: Best Streak */}
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

                                {/* --- ACTION BUTTON (MINT or SHARE) --- */}
                                {mintedTokenId ? (
                                    <button
                                        onClick={handleShareOnFarcaster}
                                        className="w-full py-4 rounded-xl font-black text-lg text-white shadow-xl shadow-blue-600/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 bg-[#0052FF] hover:bg-blue-700"
                                    >
                                        <span>🎨 SHARE ON FARCASTER</span>
                                    </button>
                                ) : (
                                    <button
                                        disabled={isPending}
                                        onClick={handleMint}
                                        className={`w-full py-4 rounded-xl font-black text-lg text-white shadow-xl shadow-blue-600/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2
                                    ${isPending ? 'bg-blue-400' : 'bg-[#0052FF] hover:bg-blue-700'}`}
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
        </div >
    );
}
