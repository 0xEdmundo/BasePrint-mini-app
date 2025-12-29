const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';

// Known Base bridge contract addresses
const BRIDGE_ADDRESSES = [
    '0x49048044d57e1c92a77f79988d21fa8faf74e97e', // Base Official Bridge
    '0x3154cf16ccdb4c6d922629664174b904d80f2c35', // Coinbase Bridge
    '0x4200000000000000000000000000000000000010', // L2 Standard Bridge
    '0x4200000000000000000000000000000000000016', // L2 To L1 Message Passer
].map(addr => addr.toLowerCase());

// Common DeFi method IDs for categorization
const DEFI_SWAP_METHODS = [
    '0x38ed1739', // swapExactTokensForTokens
    '0x7ff36ab5', // swapExactETHForTokens
    '0x18cbafe5', // swapExactTokensForETH
];
const DEFI_STAKE_METHODS = [
    '0xa694fc3a', // stake
    '0x2e1a7d4d', // withdraw
    '0x3ccfd60b', // withdraw (another variant)
];
const DEFI_LEND_METHODS = [
    '0xe2bbb158', // deposit
    '0xb6b55f25', // deposit (another variant)
];

// Alchemy API call helper
async function alchemyRequest(method: string, params: any[]) {
    const response = await fetch(ALCHEMY_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            params,
        }),
    });
    return response.json();
}

// --- ALCHEMY DATA (replaces Etherscan) ---
export async function getEtherscanData(address: string) {
    const defaultStats = {
        txCount: 0,
        daysActive: 0,
        longestStreak: 0,
        currentStreak: 0,
        bridgeToEth: 0,
        bridgeFromEth: 0,
        defiLend: 0,
        defiBorrow: 0,
        defiSwap: 0,
        defiStake: 0,
        deployed: 0,
        walletAge: 0,
    };

    if (!address) return defaultStats;

    if (!ALCHEMY_API_KEY) {
        console.error('Alchemy API key missing');
        return defaultStats;
    }

    try {
        // Fetch transfers FROM and TO this address using Alchemy
        const [fromTransfersRes, toTransfersRes] = await Promise.all([
            alchemyRequest('alchemy_getAssetTransfers', [{
                fromAddress: address,
                category: ['external', 'erc20', 'erc721', 'erc1155', 'internal'],
                withMetadata: true,
                order: 'asc',
                maxCount: '0x3e8', // 1000 transfers max
            }]),
            alchemyRequest('alchemy_getAssetTransfers', [{
                toAddress: address,
                category: ['external', 'erc20', 'erc721', 'erc1155', 'internal'],
                withMetadata: true,
                order: 'asc',
                maxCount: '0x3e8', // 1000 transfers max
            }]),
        ]);

        const fromTransfers = fromTransfersRes.result?.transfers || [];
        const toTransfers = toTransfersRes.result?.transfers || [];
        const allTransfers = [...fromTransfers, ...toTransfers];

        // Sort by block timestamp
        allTransfers.sort((a, b) => {
            const tsA = a.metadata?.blockTimestamp ? new Date(a.metadata.blockTimestamp).getTime() : 0;
            const tsB = b.metadata?.blockTimestamp ? new Date(b.metadata.blockTimestamp).getTime() : 0;
            return tsA - tsB;
        });

        // Remove duplicates by hash
        const transactions = allTransfers.filter(
            (tx, index, self) => index === self.findIndex((t) => t.hash === tx.hash)
        );

        const txCount = transactions.length;
        if (txCount === 0) return defaultStats;

        // Wallet Age
        const firstTxTimestamp = transactions[0]?.metadata?.blockTimestamp;
        const firstTxDate = firstTxTimestamp ? new Date(firstTxTimestamp) : new Date();
        const now = new Date();
        const walletAge = Math.floor((now.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24));

        // Active Days & Streaks
        const uniqueDays = new Set<string>();
        transactions.forEach((tx: any) => {
            const timestamp = tx.metadata?.blockTimestamp;
            if (timestamp) {
                const date = new Date(timestamp);
                const dayKey = date.toISOString().split('T')[0];
                uniqueDays.add(dayKey);
            }
        });

        const sortedDays = Array.from(uniqueDays).sort();

        // Longest Streak
        let longestStreak = 0;
        let tempStreak = 1;
        for (let i = 1; i < sortedDays.length; i++) {
            const prevDate = new Date(sortedDays[i - 1]);
            const currDate = new Date(sortedDays[i]);
            const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

            if (dayDiff === 1) {
                tempStreak++;
            } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        // Current Streak (from last tx date to today)
        let currentStreak = 0;
        if (sortedDays.length > 0) {
            const lastTxDate = new Date(sortedDays[sortedDays.length - 1]);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            lastTxDate.setHours(0, 0, 0, 0);

            const daysSinceLastTx = Math.floor((today.getTime() - lastTxDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysSinceLastTx <= 1) {
                currentStreak = 1;
                for (let i = sortedDays.length - 2; i >= 0; i--) {
                    const prevDate = new Date(sortedDays[i]);
                    const nextDate = new Date(sortedDays[i + 1]);
                    prevDate.setHours(0, 0, 0, 0);
                    nextDate.setHours(0, 0, 0, 0);
                    const dayDiff = Math.floor((nextDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

                    if (dayDiff === 1) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }
        }

        // Categories
        let bridgeToEth = 0;
        let bridgeFromEth = 0;
        let defiLend = 0;
        let defiBorrow = 0;
        let defiSwap = 0;
        let defiStake = 0;
        let deployed = 0;

        // Analyze transfers
        transactions.forEach((tx: any) => {
            const to = tx.to?.toLowerCase() || '';
            const from = tx.from?.toLowerCase() || '';
            const category = tx.category || '';

            // Contract Deployment (to is null/empty)
            if (!tx.to || tx.to === '') {
                deployed++;
                return;
            }

            // Bridge Detection
            if (BRIDGE_ADDRESSES.includes(to)) {
                bridgeToEth++;
            }
            if (BRIDGE_ADDRESSES.includes(from)) {
                bridgeFromEth++;
            }

            // DeFi Detection based on category
            if (category === 'erc20') {
                // ERC-20 transfers often indicate DeFi activity
                // We'll count unique contract interactions as potential DeFi
                defiSwap++; // Simplified: count ERC-20 transfers as swaps
            }
        });

        // Normalize DeFi counts to avoid over-counting
        defiSwap = Math.floor(defiSwap / 2); // Swaps often have 2 transfers

        return {
            txCount,
            daysActive: uniqueDays.size,
            longestStreak,
            currentStreak,
            bridgeToEth,
            bridgeFromEth,
            defiLend,
            defiBorrow,
            defiSwap,
            defiStake,
            deployed,
            walletAge,
        };

    } catch (error) {
        console.error('getEtherscanData (Alchemy) error:', error);
        return defaultStats;
    }
}

// --- NEYNAR DATA ---
export async function getNeynarData(address: string) {
    if (!address) return null;
    if (!NEYNAR_API_KEY) {
        console.error('Neynar API key missing');
        return null;
    }

    try {
        const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`;
        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'api_key': NEYNAR_API_KEY,
            },
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (!data || !data[address.toLowerCase()] || data[address.toLowerCase()].length === 0) {
            return null;
        }

        const user = data[address.toLowerCase()][0];

        // Use native score if available
        let score = 0;
        if (typeof user.score === 'number') {
            score = user.score;
        } else if (user.experimental?.score) {
            score = user.experimental.score;
            if (score > 1) score = score / 100;
        } else {
            score = 0.5;
        }

        score = Math.max(0, Math.min(1, score));

        return {
            username: user.username || 'Explorer',
            displayName: user.display_name || user.username || 'Explorer',
            pfp: user.pfp_url || '',
            score: parseFloat(score.toFixed(2)),
            fid: user.fid || 0,
            since: user.profile?.bio?.registered_at ? new Date(user.profile.bio.registered_at).getFullYear().toString() : '2024',
            isVerified: user.power_badge || false,
        };

    } catch (error) {
        console.error('getNeynarData error:', error);
        return null;
    }
}
// --- BASENAME DATA ---
// Basename resolution is handled client-side by OnchainKit's Name component
export async function getBasenameData(address: string) {
    // OnchainKit <Name> component handles basename display in UI
    // Server-side APIs are too slow/unreliable
    return null;
}
