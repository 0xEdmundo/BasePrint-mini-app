import fetch from 'node-fetch';

// Helper functions for analysis
const calculateStreak = (uniqueDates) => {
    if (!uniqueDates.length) return 0;
    const sortedDates = [...uniqueDates].sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    let longestStreak = 1;
    let currentStreak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
        const d1 = new Date(sortedDates[i]);
        const d2 = new Date(sortedDates[i + 1]);
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

const calculateWalletAgeDays = (firstTxTimestamp) => {
    if (!firstTxTimestamp) return 0;
    const now = new Date().getTime();
    const firstDate = new Date(firstTxTimestamp * 1000).getTime();
    const diffTime = Math.abs(now - firstDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const analyzeTransactions = (txs) => {
    let bridge = 0;
    let deployed = 0;
    let interactions = 0;

    // Base L2 Standard Bridge Address
    const L2_STANDARD_BRIDGE = '0x4200000000000000000000000000000000000010';

    txs.forEach((tx) => {
        if (tx.isError === '1') return;

        if (!tx.to || tx.to === '') {
            deployed++;
            return;
        }

        const toAddr = tx.to.toLowerCase();
        const functionName = tx.functionName ? tx.functionName.toLowerCase() : '';
        const methodId = tx.methodId || (tx.input && tx.input.length >= 10 ? tx.input.substring(0, 10) : null);

        // 1. Bridge Detection (Strict: Base Standard Bridge interactions)
        if (toAddr === L2_STANDARD_BRIDGE) {
            bridge++;
        } else if (
            // Fallback: Check for explicit bridge function names if not direct contract call
            functionName.includes('withdraw') ||
            functionName.includes('deposit') ||
            functionName.includes('finalizebridge')
        ) {
            // Only count if it looks like a bridge tx (heuristic)
            // But user asked to be sure about Base-Eth bridge. 
            // Checking the L2StandardBridge address is the most reliable way for official bridge.
            // We'll keep the strict check primarily, and maybe relax slightly for known portals if needed.
            // For now, let's stick to the address check + explicit bridge methods on other contracts if they seem related.
            if (functionName.includes('bridge')) {
                bridge++;
            }
        }

        // 2. DeFi / Interaction Detection (Lend/Borrow/Stake/Swap)
        // Exclude simple transfers (0x) and standard token transfers (0xa9059cbb)
        if (methodId && methodId !== '0x' && methodId !== '0xa9059cbb') {
            if (
                functionName.includes('supply') ||
                functionName.includes('borrow') ||
                functionName.includes('stake') ||
                functionName.includes('swap') ||
                functionName.includes('vote') ||
                functionName.includes('propose') ||
                functionName.includes('mint') || // Often DeFi related
                functionName.includes('deposit') // Often DeFi related (liquidity)
            ) {
                interactions++;
            } else if (!functionName && methodId) {
                // If no function name, assume complex interaction if not transfer
                interactions++;
            }
        }
    });

    return { bridge, defi: interactions, deployed };
};

export default async function handler(req, res) {
    const { address } = req.query;

    if (!address) {
        return res.status(400).json({ error: 'Missing address parameter' });
    }

    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;

    if (!apiKey) {
        console.error('Etherscan API key missing');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        // 1. Fetch Transaction List
        const txUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
        const txRes = await fetch(txUrl);
        const txJson = await txRes.json();

        // 2. Fetch Balance
        const balUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
        const balRes = await fetch(balUrl);
        const balJson = await balRes.json();

        if (txJson.status === '0' && txJson.message === 'No transactions found') {
            return res.status(200).json({
                txCount: 0,
                daysActive: 0,
                longestStreak: 0,
                bridge: 0,
                defi: 0,
                deployed: 0,
                walletAge: 0,
                isVerified: false
            });
        }

        if (!Array.isArray(txJson.result)) {
            throw new Error(`Invalid Etherscan response: ${JSON.stringify(txJson)}`);
        }

        const txs = txJson.result;

        // Calculations
        const uniqueDates = Array.from(
            new Set(
                txs.map((tx) =>
                    new Date(parseInt(tx.timeStamp) * 1000).toDateString()
                )
            )
        );

        const analysis = analyzeTransactions(txs);
        const longestStreak = calculateStreak(uniqueDates);
        const firstTxTimestamp = txs.length > 0 ? parseInt(txs[0].timeStamp, 10) : 0;
        const walletAgeDays = calculateWalletAgeDays(firstTxTimestamp);

        const balanceRaw = typeof balJson.result === 'string' ? parseInt(balJson.result || '0', 10) : 0;
        const isVerified = txs.length > 5 && balanceRaw > 0;

        const stats = {
            txCount: txs.length,
            daysActive: uniqueDates.length,
            longestStreak,
            bridge: analysis.bridge,
            defi: analysis.defi,
            deployed: analysis.deployed,
            walletAge: walletAgeDays,
            isVerified
        };

        return res.status(200).json(stats);

    } catch (error) {
        console.error('Etherscan Handler Error:', error);
        return res.status(500).json({ error: 'Failed to fetch onchain data' });
    }
}
