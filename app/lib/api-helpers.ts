import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const BASE_ETHERSCAN_API = 'https://api.etherscan.io/v2/api';
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';

// --- ETHERSCAN DATA ---
// --- ETHERSCAN DATA ---
export async function getEtherscanData(address: string) {
    const defaultStats = {
        txCount: 0,
        daysActive: 0,
        longestStreak: 0,
        bridge: 0,
        defi: 0,
        deployed: 0,
        walletAge: 0,
    };

    if (!address) return defaultStats;

    if (!ETHERSCAN_API_KEY) {
        console.error('Etherscan API key missing');
        return defaultStats;
    }

    try {
        const txListUrl = `${BASE_ETHERSCAN_API}?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
        const txRes = await fetch(txListUrl, { next: { revalidate: 60 } }); // Cache for 60s

        if (!txRes.ok) {
            console.error(`BaseScan API HTTP Error: ${txRes.status}`);
            return defaultStats;
        }

        const txData = await txRes.json();

        if (txData.status !== '1' || !txData.result) {
            console.error('BaseScan API Error/Status:', txData.message, txData.result);
            return defaultStats;
        }

        const transactions = txData.result;
        const txCount = transactions.length;

        if (txCount === 0) return defaultStats;

        // Wallet Age
        const firstTx = transactions[0];
        const firstTxDate = new Date(parseInt(firstTx.timeStamp) * 1000);
        const now = new Date();
        const walletAge = Math.floor((now.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24));

        // Active Days & Streak
        const uniqueDays = new Set<string>();
        transactions.forEach((tx: any) => {
            const date = new Date(parseInt(tx.timeStamp) * 1000);
            const dayKey = date.toISOString().split('T')[0];
            uniqueDays.add(dayKey);
        });

        const sortedDays = Array.from(uniqueDays).sort();
        let longestStreak = 0;
        let currentStreak = 1;

        for (let i = 1; i < sortedDays.length; i++) {
            const prevDate = new Date(sortedDays[i - 1]);
            const currDate = new Date(sortedDays[i]);
            const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

            if (dayDiff === 1) {
                currentStreak++;
            } else {
                longestStreak = Math.max(longestStreak, currentStreak);
                currentStreak = 1;
            }
        }
        longestStreak = Math.max(longestStreak, currentStreak);

        // Categories
        let bridge = 0;
        let defi = 0;
        let deployed = 0;

        const L2_STANDARD_BRIDGE = '0x4200000000000000000000000000000000000010';

        transactions.forEach((tx: any) => {
            const to = tx.to?.toLowerCase();
            const functionName = tx.functionName ? tx.functionName.toLowerCase() : '';
            const methodId = tx.methodId || (tx.input && tx.input.length >= 10 ? tx.input.substring(0, 10) : null);

            // Contract Deployment
            if (tx.to === '' && tx.contractAddress !== '') {
                deployed++;
                return;
            }

            // Bridge Detection
            if (to === L2_STANDARD_BRIDGE) {
                bridge++;
            } else if (
                functionName.includes('withdraw') ||
                functionName.includes('deposit') ||
                functionName.includes('finalizebridge') ||
                functionName.includes('bridge')
            ) {
                if (functionName.includes('bridge') || to === '0x49048044d57e1c92a77f79988d21fa8faf74e97e') { // Base Bridge
                    bridge++;
                }
            }

            // DeFi / Interaction Detection
            // Check for common DeFi method signatures or names
            if (methodId && methodId !== '0x' && methodId !== '0xa9059cbb') { // Exclude simple transfer
                if (
                    functionName.includes('supply') ||
                    functionName.includes('borrow') ||
                    functionName.includes('stake') ||
                    functionName.includes('swap') ||
                    functionName.includes('vote') ||
                    functionName.includes('propose') ||
                    functionName.includes('mint') ||
                    functionName.includes('deposit') ||
                    functionName.includes('approve') ||
                    functionName.includes('execute')
                ) {
                    defi++;
                } else if (!functionName && methodId) {
                    // If no function name but has methodId, assume interaction (likely DeFi/Contract)
                    defi++;
                }
            }
        });

        return {
            txCount,
            daysActive: uniqueDays.size,
            longestStreak,
            bridge,
            defi,
            deployed,
            walletAge,
        };

    } catch (error) {
        console.error('getEtherscanData error:', error);
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
        const followerCount = user.follower_count || 0;
        const followingCount = user.following_count || 0;

        // Robust Score Calculation
        let score = 0.5;
        if (followerCount > 0) score += Math.min(followerCount / 5000, 0.3); // Cap at 0.3 for 5k followers
        if (followingCount > 0) score += Math.min(followingCount / 1000, 0.1); // Cap at 0.1 for 1k following
        if (user.power_badge) score += 0.1;

        // Bonus for active badge or other stats if available
        if (user.active_status === 'active') score += 0.05;

        score = Math.min(score, 1.0);

        return {
            username: user.username || 'Explorer',
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
export async function getBasenameData(address: string) {
    if (!address) return null;
    try {
        const url = `https://resolver-api.basename.app/v1/basenames/${address}`;
        const response = await fetch(url, { headers: { 'accept': 'application/json' } });
        if (!response.ok) return null;
        const data = await response.json();
        return data && data.name ? { basename: data.name } : null;
    } catch (error) {
        console.error('getBasenameData error:', error);
        return null;
    }
}
