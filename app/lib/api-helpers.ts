const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const BASE_ETHERSCAN_API = 'https://api.etherscan.io/v2/api';
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';

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
        // Fetch Normal and Internal Transactions in parallel (Base Chain ID: 8453)
        const txListUrl = `${BASE_ETHERSCAN_API}?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
        const internalTxUrl = `${BASE_ETHERSCAN_API}?chainid=8453&module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;

        const [txRes, internalTxRes] = await Promise.all([
            fetch(txListUrl, { next: { revalidate: 60 } }),
            fetch(internalTxUrl, { next: { revalidate: 60 } })
        ]);

        if (!txRes.ok) {
            console.error(`Etherscan API HTTP Error: ${txRes.status}`);
            return defaultStats;
        }

        const txData = await txRes.json();
        // Internal txs might fail or be empty, treat as optional but log if error
        const internalTxData = internalTxRes.ok ? await internalTxRes.json() : { result: [] };

        if (txData.status !== '1' || !txData.result) {
            // 'No transactions found' is a valid state (status 0), return defaults
            if (txData.message === 'No transactions found') return defaultStats;

            console.error('Etherscan API Error:', txData.message, txData.result);
            return defaultStats;
        }

        const transactions = txData.result;
        const internalTxs = Array.isArray(internalTxData.result) ? internalTxData.result : [];

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

        // Base L2 Standard Bridge Address
        const L2_STANDARD_BRIDGE = '0x4200000000000000000000000000000000000010';

        // 1. Analyze Normal Transactions
        transactions.forEach((tx: any) => {
            const to = tx.to?.toLowerCase();
            const functionName = tx.functionName ? tx.functionName.toLowerCase() : '';
            const methodId = tx.methodId || (tx.input && tx.input.length >= 10 ? tx.input.substring(0, 10) : null);

            // Contract Deployment
            if (tx.to === '' && tx.contractAddress !== '') {
                deployed++;
                return;
            }

            // Bridge Detection (Outgoing: Base -> L1)
            // Check if interacting with L2 Standard Bridge
            if (to === L2_STANDARD_BRIDGE) {
                bridge++;
            } else if (
                functionName.includes('withdraw') ||
                functionName.includes('bridge')
            ) {
                // Heuristic for other bridge interactions
                if (functionName.includes('bridge') || to === '0x49048044d57e1c92a77f79988d21fa8faf74e97e') {
                    bridge++;
                }
            }

            // DeFi Detection
            if (methodId && methodId !== '0x' && methodId !== '0xa9059cbb') { // Exclude simple transfer
                if (
                    functionName.includes('swap') ||
                    functionName.includes('stake') ||
                    functionName.includes('mint') ||
                    functionName.includes('supply') ||
                    functionName.includes('borrow') ||
                    functionName.includes('repay') ||
                    functionName.includes('harvest') ||
                    functionName.includes('claim') ||
                    functionName.includes('deposit') // Deposit to DeFi protocols
                ) {
                    defi++;
                } else if (!functionName && methodId) {
                    // Heuristic: If it has a methodId but no name, and it's not a simple transfer, count as interaction
                    defi++;
                }
            }
        });

        // 2. Analyze Internal Transactions (Incoming: L1 -> Base)
        // Deposits from L1 usually appear as internal transactions FROM the L2 Bridge
        internalTxs.forEach((tx: any) => {
            if (tx.from.toLowerCase() === L2_STANDARD_BRIDGE) {
                bridge++;
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

        // Use native score if available
        // Neynar returns score as 0-1.0 decimal usually, or sometimes 0-100 in experimental
        let score = 0;

        if (typeof user.score === 'number') {
            score = user.score; // Assuming 0-1.0
        } else if (user.experimental?.score) {
            score = user.experimental.score; // Check range, if > 1 assume 0-100 and normalize
            if (score > 1) score = score / 100;
        } else {
            // Fallback if no score field exists at all (should be rare for active users)
            score = 0.5;
        }

        // Ensure score is within 0-1 range
        score = Math.max(0, Math.min(1, score));

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
