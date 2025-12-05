"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { Name } from '@coinbase/onchainkit/identity';
import { base } from 'wagmi/chains';
import sdk from '@farcaster/frame-sdk';
import html2canvas from 'html2canvas';
import { checkNFTOwnership, getDailySearchStatus, incrementSearchCount } from '../lib/checkNFTOwnership';

// --- ICONS ---
const AppLogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#0052FF" />
        <path d="M50 20C33.4315 20 20 33.4315 20 50C20 66.5685 33.4315 80 50 80C66.5685 80 80 66.5685 80 50" stroke="white" strokeWidth="5" strokeLinecap="round" />
        <path d="M50 35C41.7157 35 35 41.7157 35 50C35 58.2843 41.7157 65 50 65" stroke="white" strokeWidth="5" strokeLinecap="round" />
        <circle cx="50" cy="50" r="4" fill="white" />
    </svg>
);

interface LookupContentProps {
    onSwitchToMyId: () => void;
}

export default function LookupContent({ onSwitchToMyId }: LookupContentProps) {
    const { address, isConnected } = useAccount();
    const { connect, connectors } = useConnect();

    const [hasNFT, setHasNFT] = useState<boolean | null>(null);
    const [checkingNFT, setCheckingNFT] = useState(false);
    const [searchLimit, setSearchLimit] = useState({ count: 0, remaining: 3, canSearch: true });

    const [searchAddress, setSearchAddress] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResult, setSearchResult] = useState<any>(null);
    const [searchError, setSearchError] = useState<string | null>(null);

    const cardRef = useRef<HTMLDivElement>(null);

    // Check NFT ownership when connected
    useEffect(() => {
        if (isConnected && address) {
            setCheckingNFT(true);
            checkNFTOwnership(address)
                .then(setHasNFT)
                .finally(() => setCheckingNFT(false));

            setSearchLimit(getDailySearchStatus(address));
        }
    }, [isConnected, address]);

    // Handle search
    const handleSearch = useCallback(async () => {
        if (!searchAddress || !searchLimit.canSearch) return;

        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(searchAddress)) {
            setSearchError('Geçersiz cüzdan adresi');
            return;
        }

        setSearchLoading(true);
        setSearchError(null);
        setSearchResult(null);

        try {
            // Fetch data for the searched address
            const [etherscanRes, basenameRes] = await Promise.all([
                fetch(`/api/etherscan?address=${searchAddress}`, { cache: 'no-store' }),
                fetch(`/api/basename?address=${searchAddress}`, { cache: 'no-store' }),
            ]);

            const stats = etherscanRes.ok ? await etherscanRes.json() : null;
            const basenameData = basenameRes.ok ? await basenameRes.json() : null;

            if (stats) {
                // Increment search count for this wallet
                incrementSearchCount(address);
                setSearchLimit(getDailySearchStatus(address));

                setSearchResult({
                    address: searchAddress,
                    basename: basenameData?.basename || null,
                    stats: {
                        ...stats,
                        bridge: (stats.bridgeToEth || 0) + (stats.bridgeFromEth || 0),
                        defi: (stats.defiLend || 0) + (stats.defiBorrow || 0) + (stats.defiSwap || 0) + (stats.defiStake || 0),
                    },
                });
            } else {
                setSearchError('Cüzdan verisi bulunamadı');
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchError('Arama sırasında hata oluştu');
        } finally {
            setSearchLoading(false);
        }
    }, [searchAddress, searchLimit.canSearch]);

    // Share on Farcaster (using html2canvas - separate from Page 1 system)
    const handleShare = async () => {
        if (!cardRef.current) return;

        try {
            // Capture the card as image
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#f1f5f9',
                scale: 2,
            });

            const imageDataUrl = canvas.toDataURL('image/png');

            // For now, share without image (Farcaster doesn't support data URLs directly)
            // Just share the text and app link
            const castText = `🔍 BasePrint Lookup

Checked wallet: ${searchResult.address.slice(0, 6)}...${searchResult.address.slice(-4)}
${searchResult.basename ? `Basename: ${searchResult.basename}` : ''}
📊 ${searchResult.stats.txCount} TXs | ${searchResult.stats.daysActive} Active Days

Discover onchain identities with BasePrint!`;

            const miniAppLink = 'https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint';
            const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}&embeds[]=${encodeURIComponent(miniAppLink)}`;

            sdk.actions.openUrl(warpcastUrl);
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    // Reset search - check limit here instead of before showing result
    const handleNewSearch = () => {
        // Check if limit is reached AFTER current result is shown
        const currentStatus = getDailySearchStatus(address);
        if (!currentStatus.canSearch) {
            setSearchResult(null);
            setSearchError('Daily limit reached. Try again after 12:00 AM UTC.');
            return;
        }
        setSearchAddress('');
        setSearchResult(null);
        setSearchError(null);
    };

    // Not connected
    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-gradient-to-b from-blue-50 to-white px-6">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
                    <svg className="w-10 h-10 text-[#0052FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2">Wallet Lookup</h2>
                <p className="text-gray-500 text-sm text-center mb-6">
                    Connect your wallet to search Base chain activity
                </p>
                <button
                    onClick={() => {
                        // Prefer injected (MetaMask, Rabby, OKX) or coinbaseWallet for web
                        const connector = connectors.find(c => c.id === 'injected') || connectors.find(c => c.id === 'coinbaseWalletSDK') || connectors[1];
                        if (connector) connect({ connector });
                    }}
                    className="bg-[#0052FF] text-white py-3 px-8 rounded-xl font-bold hover:bg-blue-600 transition"
                >
                    Connect Wallet
                </button>
            </div>
        );
    }

    // Checking NFT ownership
    if (checkingNFT || hasNFT === null) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px]">
                <div className="w-8 h-8 border-2 border-[#0052FF] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs text-slate-400 font-mono">CHECKING ACCESS...</p>
            </div>
        );
    }

    // No NFT - redirect to mint
    if (!hasNFT) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-gradient-to-b from-orange-50 to-white px-6">
                <div className="text-5xl mb-4">🔒</div>
                <h2 className="text-xl font-black text-slate-900 mb-2">Access Required</h2>
                <p className="text-gray-500 text-sm text-center mb-6">
                    You need a BasePrint NFT to use Lookup. Mint your identity first!
                </p>
                <button
                    onClick={onSwitchToMyId}
                    className="bg-[#0052FF] text-white py-3 px-8 rounded-xl font-bold hover:bg-blue-600 transition"
                >
                    Go to My ID & Mint
                </button>
            </div>
        );
    }

    // Has NFT but no search limit
    if (!searchLimit.canSearch) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] bg-gradient-to-b from-gray-50 to-white px-6">
                <div className="text-5xl mb-4">⏰</div>
                <h2 className="text-xl font-black text-slate-900 mb-2">Daily Limit Reached</h2>
                <p className="text-gray-500 text-sm text-center mb-2">
                    You've used all 3 searches for today.
                </p>
                <p className="text-xs text-gray-400 mb-6">
                    Resets at 12:00 AM UTC
                </p>
            </div>
        );
    }

    // Search form or results
    return (
        <div className="pt-4 pb-24 px-5 min-h-[500px]">
            {!searchResult ? (
                // Search Form
                <div className="space-y-6">
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-black text-slate-900 mb-2">Wallet Lookup</h2>
                        <p className="text-sm text-gray-500">
                            Search any wallet's Base chain activity
                        </p>
                        <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-[#0052FF] text-xs font-bold px-3 py-1 rounded-full">
                            <span>🎫</span>
                            <span>{searchLimit.remaining}/3 searches left today</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <input
                            type="text"
                            placeholder="0x... wallet address"
                            value={searchAddress}
                            onChange={(e) => setSearchAddress(e.target.value)}
                            className="w-full px-4 py-4 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0052FF] focus:border-transparent"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={searchLoading || !searchAddress}
                            className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all ${searchLoading || !searchAddress
                                ? 'bg-gray-300'
                                : 'bg-[#0052FF] hover:bg-blue-600 shadow-lg shadow-blue-500/30'
                                }`}
                        >
                            {searchLoading ? (
                                <span className="animate-pulse">Searching...</span>
                            ) : (
                                '🔍 Search Wallet'
                            )}
                        </button>
                    </div>

                    {searchError && (
                        <div className="bg-red-50 text-red-500 text-sm text-center p-3 rounded-xl border border-red-100">
                            {searchError}
                        </div>
                    )}
                </div>
            ) : (
                // Search Results
                <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500" ref={cardRef}>
                    {/* --- WALLET CARD (Blue Card) --- */}
                    <div className="relative w-full aspect-[1.7/1] rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0052FF] via-[#0042cc] to-[#002980]"></div>
                        <div className="absolute -right-10 -bottom-20 w-60 h-60 bg-cyan-400 opacity-20 rounded-full blur-3xl"></div>
                        <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                            <AppLogo className="w-40 h-40 text-white" />
                        </div>

                        <div className="absolute inset-0 p-5 text-white flex flex-col justify-between z-10">
                            <div className="flex items-start gap-4">
                                {/* Wallet Icon */}
                                <div className="w-20 h-20 rounded-full border-2 border-white shadow-lg bg-slate-800 flex items-center justify-center">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                    </svg>
                                </div>

                                <div className="flex flex-col flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-blue-200 font-mono opacity-80 uppercase tracking-widest">
                                            BASE WALLET
                                        </span>
                                        <AppLogo className="w-6 h-6 opacity-80" />
                                    </div>

                                    <h3 className="text-lg font-black tracking-tight leading-tight truncate mt-1 font-mono">
                                        {searchResult.address.slice(0, 6)}...{searchResult.address.slice(-4)}
                                    </h3>

                                    {searchResult.basename && (
                                        <span className="text-xs text-blue-200 font-medium truncate">
                                            {searchResult.basename}
                                        </span>
                                    )}

                                    <div className="mt-2">
                                        <div className="text-[10px] font-bold text-[#0052FF] bg-white px-2 py-0.5 rounded-full inline-block shadow-sm">
                                            <Name address={searchResult.address as `0x${string}`} chain={base} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Wallet Age Bar */}
                            <div className="mt-auto">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-[10px] text-blue-200 font-bold uppercase">Wallet Age</span>
                                    <span className="text-xl font-black leading-none">{searchResult.stats.walletAge} Days</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-300 to-green-500"
                                        style={{ width: `${Math.min((searchResult.stats.walletAge / 365) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- STATS GRID --- */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-sm">
                        <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                            <div className="p-3 text-center">
                                <div className="font-black text-slate-800 text-lg">{searchResult.stats.daysActive}</div>
                                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Active Days</div>
                            </div>
                            <div className="p-3 text-center">
                                <div className="font-black text-slate-800 text-lg">
                                    {searchResult.stats.walletAge} <span className="text-xs text-gray-400 font-normal">Days</span>
                                </div>
                                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Wallet Age</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                            <div className="p-3 text-center">
                                <div className="font-black text-slate-800 text-lg">{searchResult.stats.txCount}</div>
                                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total TXs</div>
                            </div>
                            <div className="p-3 text-center">
                                <div className="font-black text-slate-800 text-lg">{searchResult.stats.bridge}</div>
                                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Bridge TXs</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                            <div className="p-3 text-center">
                                <div className="font-black text-slate-800 text-lg">{searchResult.stats.defi}</div>
                                <div className="flex flex-col items-center justify-center leading-none mt-1">
                                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Lend/Borrow</span>
                                    <span className="text-[8px] text-gray-300 font-bold uppercase tracking-wider">Swap/Stake</span>
                                </div>
                            </div>
                            <div className="p-3 text-center">
                                <div className="font-black text-slate-800 text-lg">{searchResult.stats.deployed}</div>
                                <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Smart Contracts</div>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-50/50 flex justify-between items-center px-6">
                            <span className="text-[10px] font-bold text-[#0052FF] uppercase tracking-wider">Best Streak</span>
                            <div className="flex items-center gap-1">
                                <span className="text-base">🔥</span>
                                <span className="font-black text-[#0052FF] text-lg">{searchResult.stats.longestStreak} Days</span>
                            </div>
                        </div>
                    </div>

                    {/* --- ACTION BUTTONS --- */}
                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={handleShare}
                            className="flex-1 py-4 rounded-xl font-bold text-white bg-[#0052FF] hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                        >
                            🎨 Share
                        </button>
                        <button
                            onClick={handleNewSearch}
                            className="flex-1 py-4 rounded-xl font-bold text-[#0052FF] bg-blue-50 hover:bg-blue-100 transition flex items-center justify-center gap-2"
                        >
                            🔄 New Search
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
