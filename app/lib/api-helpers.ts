const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const BASE_ETHERSCAN_API = 'https://api.etherscan.io/v2/api';
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';

// --- ETHERSCAN DATA ---
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
        const internalTxData = internalTxRes.ok ? await internalTxRes.json() : { result: [] };

        if (txData.status !== '1' || !txData.result) {
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

        // Active Days & Streaks
        const uniqueDays = new Set<string>();
        transactions.forEach((tx: any) => {
            const date = new Date(parseInt(tx.timeStamp) * 1000);
            const dayKey = date.toISOString().split('T')[0];
            uniqueDays.add(dayKey);
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

            // If last tx was today or yesterday, calculate current streak
            if (daysSinceLastTx <= 1) {
                currentStreak = 1;
                // Count backwards from last day
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
            if (to === L2_STANDARD_BRIDGE) {
                bridgeToEth++;
            } else if (
                functionName.includes('withdraw') ||
                functionName.includes('bridge')
            ) {
                if (functionName.includes('bridge') || to === '0x49048044d57e1c92a77f79988d21fa8faf74e97e') {
                    bridgeToEth++;
                }
            }

            // DeFi Detection - Categorized (not mutually exclusive)
            if (methodId && methodId !== '0x' && methodId !== '0xa9059cbb') {
                // Lending/Supply
                if (
                    functionName.includes('lend') ||
                    functionName.includes('supply') ||
                    (functionName.includes('deposit') && (
                        functionName.includes('aave') ||
                        functionName.includes('compound') ||
                        functionName.includes('pool') ||
                        functionName.includes('vault')
                    ))
                ) {
                    defiLend++;
                }
                // Borrowing
                if (
                    functionName.includes('borrow') ||
                    functionName.includes('repay')
                ) {
                    defiBorrow++;
                }
                // Swapping
                if (
                    functionName.includes('swap') ||
                    functionName.includes('exchange') ||
                    functionName.includes('trade')
                ) {
                    defiSwap++;
                }
                // Staking/Farming
                if (
                    functionName.includes('stake') ||
                    functionName.includes('farm') ||
                    functionName.includes('harvest') ||
                    functionName.includes('claim') ||
                    functionName.includes('unstake') ||
                    functionName.includes('withdraw') && (
                        functionName.includes('stake') ||
                        functionName.includes('farm') ||
                        functionName.includes('reward')
                    )
                ) {
                    defiStake++;
                }

                // If no specific category matched but has complex methodId, count as general DeFi interaction
                // This catches many DeFi interactions that don't have decoded function names
                if (!functionName || functionName === '') {
                    // Heuristic: complex method IDs are likely DeFi
                    // Common DeFi method IDs that might not be decoded
                    const commonDefiMethods = [
                        '0x38ed1739', // swapExactTokensForTokens
                        '0x7ff36ab5', // swapExactETHForTokens
                        '0x18cbafe5', // swapExactTokensForETH
                        '0xe8e33700', // addLiquidity
                        '0xf305d719', // addLiquidityETH
                        '0xbaa2abde', // removeLiquidity
                        '0x02751cec', // removeLiquidityETH
                        '0xa694fc3a', // stake
                        '0x2e1a7d4d', // withdraw
                        '0x3ccfd60b', // withdraw (another variant)
                        '0xe2bbb158', // deposit
                        '0xb6b55f25', // deposit (another variant)
                    ];

                    if (commonDefiMethods.includes(methodId)) {
                        // Try to categorize based on method ID
                        if (methodId.startsWith('0x38ed') || methodId.startsWith('0x7ff3') || methodId.startsWith('0x18cb')) {
                            defiSwap++;
                        } else if (methodId.startsWith('0xa694') || methodId.startsWith('0x2e1a') || methodId.startsWith('0x3ccf')) {
                            defiStake++;
                        } else if (methodId.startsWith('0xe2bb') || methodId.startsWith('0xb6b5')) {
                            defiLend++;
                        }
                    }
                }
            }
        });

        // 2. Analyze Internal Transactions (Incoming: L1 -> Base)
        internalTxs.forEach((tx: any) => {
            if (tx.from.toLowerCase() === L2_STANDARD_BRIDGE) {
                bridgeFromEth++;
            }
        });

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
