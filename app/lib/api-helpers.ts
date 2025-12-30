const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';

// Known Base bridge contract addresses (for bridge detection)
const BRIDGE_ADDRESSES = [
    '0x49048044d57e1c92a77f79988d21fa8faf74e97e', // Base Official Bridge L1
    '0x3154cf16ccdb4c6d922629664174b904d80f2c35', // Coinbase Bridge
    '0x4200000000000000000000000000000000000010', // L2 Standard Bridge
    '0x4200000000000000000000000000000000000016', // L2 To L1 Message Passer
    '0x4200000000000000000000000000000000000007', // L2 Cross Domain Messenger
    '0x866e82a600a1414e583f7f13623f1ac5d58b0afa', // Across Bridge
    '0x977f82a600a1414e583f7f13623f1ac5d58b1c0b', // Across Bridge Executor
].map(addr => addr.toLowerCase());

// Bridge method IDs for detection
const BRIDGE_METHOD_IDS = [
    '0x32b7006d', // depositETH
    '0x49228978', // bridgeETH
    '0x5cae9c06', // withdraw
    '0x9a2ac9d9', // bridgeAsset
    '0xd764ad0b', // relayMessage
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

// Basescan API for bridge and contract deployment detection (free tier)
async function fetchBridgeAndDeployedFromBasescan(address: string): Promise<{ bridge: number; deployed: number }> {
    try {
        // Etherscan API v2 with Base chainid (8453)
        const url = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;

        const response = await fetch(url, { next: { revalidate: 300 } }); // Cache 5 minutes
        if (!response.ok) {
            console.error('Basescan API error:', response.status);
            return { bridge: 0, deployed: 0 };
        }

        const data = await response.json();
        if (data.status !== '1' || !Array.isArray(data.result)) {
            return { bridge: 0, deployed: 0 };
        }

        let bridge = 0;
        let deployed = 0;

        data.result.forEach((tx: any) => {
            // Contract deployment: to is empty and contractAddress exists
            if ((!tx.to || tx.to === '') && tx.contractAddress) {
                deployed++;
                return;
            }

            const to = tx.to?.toLowerCase() || '';
            const from = tx.from?.toLowerCase() || '';
            const methodId = tx.methodId || (tx.input?.substring(0, 10) || '');

            // Bridge detection via address
            if (BRIDGE_ADDRESSES.includes(to) || BRIDGE_ADDRESSES.includes(from)) {
                bridge++;
                return;
            }

            // Bridge detection via L2 system addresses
            if (to.startsWith('0x4200000000000000000000000000') || from.startsWith('0x4200000000000000000000000000')) {
                bridge++;
                return;
            }

            // Bridge detection via method ID
            if (BRIDGE_METHOD_IDS.includes(methodId)) {
                bridge++;
            }
        });

        return { bridge, deployed };
    } catch (error) {
        console.error('Basescan fetch error:', error);
        return { bridge: 0, deployed: 0 };
    }
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
        // Fetch transfers FROM and TO this address using Alchemy (main stats)
        // AND fetch bridge/deployed from Etherscan in parallel
        const [fromTransfersRes, toTransfersRes, bridgeDeployedData] = await Promise.all([
            alchemyRequest('alchemy_getAssetTransfers', [{
                fromAddress: address,
                category: ['external', 'erc20', 'erc721', 'erc1155'],
                withMetadata: true,
                order: 'asc',
                maxCount: '0x3e8', // 1000 transfers max
            }]),
            alchemyRequest('alchemy_getAssetTransfers', [{
                toAddress: address,
                category: ['external', 'erc20', 'erc721', 'erc1155'],
                withMetadata: true,
                order: 'asc',
                maxCount: '0x3e8', // 1000 transfers max
            }]),
            fetchBridgeAndDeployedFromBasescan(address), // Etherscan for bridge/deployed
        ]);

        // Get bridge and deployed counts from Etherscan
        const etherscanBridge = bridgeDeployedData.bridge;
        const deployed = bridgeDeployedData.deployed;
        // Get all transfers
        const fromTransfers = fromTransfersRes.result?.transfers || [];
        const toTransfers = toTransfersRes.result?.transfers || [];

        // Combine ALL transfers for complete stats
        const allTransfers = [...fromTransfers, ...toTransfers];

        // Sort all transfers by block timestamp
        allTransfers.sort((a: any, b: any) => {
            const tsA = a.metadata?.blockTimestamp ? new Date(a.metadata.blockTimestamp).getTime() : 0;
            const tsB = b.metadata?.blockTimestamp ? new Date(b.metadata.blockTimestamp).getTime() : 0;
            return tsA - tsB;
        });

        // Remove duplicates by hash for main stats
        const transactions = allTransfers.filter(
            (tx: any, index: number, self: any[]) => index === self.findIndex((t) => t.hash === tx.hash)
        );

        // deployed count comes from Etherscan (bridgeDeployedData.deployed above)

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
        // Note: deployed is already calculated above via eth_getTransactionReceipt

        // Extended bridge addresses for Base (comprehensive list)
        const bridgeAddrs = [
            // Official Base/Coinbase bridges
            '0x49048044d57e1c92a77f79988d21fa8faf74e97e', // Base Official Bridge L1
            '0x3154cf16ccdb4c6d922629664174b904d80f2c35', // Coinbase Bridge
            '0x4200000000000000000000000000000000000010', // L2 Standard Bridge
            '0x4200000000000000000000000000000000000016', // L2 To L1 Message Passer
            '0x4200000000000000000000000000000000000007', // L2 Cross Domain Messenger
            // Third-party bridges
            '0x866e82a600a1414e583f7f13623f1ac5d58b0afa', // Across Bridge
            '0x977f82a600a1414e583f7f13623f1ac5d58b1c0b', // Across Bridge Executor (found in user TX)
            '0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae', // LI.FI
            '0x2a3dd3eb832af982ec71669e178424b10dca2ede', // Hop Protocol
            '0xd7aa9ba6caac7b0436c91396f22ca5a7f31664fc', // Synapse
            '0x001e3f136c2f804854581da55ad7660a2b35def7', // Allbridge Core
            '0x1efe2c85989d97febbd0743cdd79b9f0826314f6', // Allbridge CCTP
            '0x43de2d77bf8027e25dbd179b491e8d64f38398aa', // deBridge DlnSource
            '0xe7351fd770a37282b91d153ee690b63579d6dd7f', // deBridge DlnDestination
            '0xaf54be5b6eec24d6bfacf1cce4eaf680a8239398', // Stargate
            '0x45f1a95a4d3f3836523f5c83673c797f4d4d263b', // Stargate Router
            '0x8731d54e9d02c286767d56ac03e8037c07e01e98', // Wormhole
            '0x5a58505a96d1dbf8df91cb21b54419fc36e93fde', // Celer cBridge
            '0xc30141b657f4216252dc59af2e7cdb9d8792e1b0', // Socket Gateway
            '0x3a23f943181408eac424116af7b7790c94cb97a5', // Socket Gateway v2
            '0xb8f275fbf7a959f4bce59999a2ef122a099e81a8', // Bungee
            '0x0000000000001ff3684f28c67538d4d072c22734', // Orbiter Finance
        ].map(addr => addr.toLowerCase());

        // Analyze transfers for bridge detection
        const uniqueErc20Contracts = new Set<string>();
        const userAddrLower = address.toLowerCase();

        transactions.forEach((tx: any) => {
            const to = tx.to?.toLowerCase() || '';
            const from = tx.from?.toLowerCase() || '';
            const category = tx.category || '';

            // Bridge Detection - comprehensive checks
            // Check if to/from matches any bridge address (exact match)
            const isToBridgeExact = bridgeAddrs.includes(to);
            const isFromBridgeExact = bridgeAddrs.includes(from);

            // Check if to/from starts with known L2 system prefix (0x4200...)
            const isToL2System = to.startsWith('0x4200000000000000000000000000');
            const isFromL2System = from.startsWith('0x4200000000000000000000000000');

            // Bridge outgoing (Base -> L1): sending to bridge contract
            if (isToBridgeExact || (isToL2System && category === 'external')) {
                bridgeToEth++;
            }

            // Bridge incoming (L1 -> Base): receiving from bridge contract
            if (isFromBridgeExact || isFromL2System) {
                bridgeFromEth++;
            }

            // DeFi Detection - count unique ERC-20 contract interactions
            if (category === 'erc20' && to) {
                uniqueErc20Contracts.add(to);
            }
        });

        // DeFi count: number of unique ERC-20 contracts interacted with
        defiSwap = uniqueErc20Contracts.size;

        // Combine bridge counts: use max of Alchemy and Etherscan detection
        // This ensures we catch bridges from both sources without double counting
        const totalBridge = Math.max(bridgeToEth + bridgeFromEth, etherscanBridge);

        return {
            txCount,
            daysActive: uniqueDays.size,
            longestStreak,
            currentStreak,
            bridgeToEth: Math.max(bridgeToEth, Math.floor(etherscanBridge / 2)),
            bridgeFromEth: Math.max(bridgeFromEth, Math.ceil(etherscanBridge / 2)),
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
