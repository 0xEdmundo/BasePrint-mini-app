import { NextRequest, NextResponse } from 'next/server';

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const BASE_ETHERSCAN_API = 'https://api.basescan.org/api';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (!ETHERSCAN_API_KEY) {
        return NextResponse.json({ error: 'Etherscan API key not configured' }, { status: 500 });
    }

    try {
        // Fetch transaction list
        const txListUrl = `${BASE_ETHERSCAN_API}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
        const txRes = await fetch(txListUrl);
        const txData = await txRes.json();

        if (txData.status !== '1' || !txData.result) {
            return NextResponse.json({
                txCount: 0,
                daysActive: 0,
                longestStreak: 0,
                bridge: 0,
                defi: 0,
                deployed: 0,
                walletAge: 0,
            });
        }

        const transactions = txData.result;
        const txCount = transactions.length;

        // Calculate wallet age (days since first transaction)
        const firstTx = transactions[0];
        const firstTxDate = new Date(parseInt(firstTx.timeStamp) * 1000);
        const now = new Date();
        const walletAge = Math.floor((now.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24));

        // Calculate active days and longest streak
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

        // Count specific transaction types
        let bridge = 0;
        let defi = 0;
        let deployed = 0;

        // Bridge detection (common bridge contract addresses on Base)
        const bridgeAddresses = [
            '0x49048044d57e1c92a77f79988d21fa8faf74e97e', // Base Bridge
            '0x3154cf16ccdb4c6d922629664174b904d80f2c35', // Base Portal
        ];

        // DeFi detection (common DeFi protocols on Base)
        const defiAddresses = [
            '0x4200000000000000000000000000000000000006', // WETH
            '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', // Aerodrome
            '0x8909dc15e40173ff4699343b6eb8132c65e18ec6', // Uniswap V3
        ];

        transactions.forEach((tx: any) => {
            const to = tx.to?.toLowerCase();

            if (bridgeAddresses.includes(to)) {
                bridge++;
            }

            if (defiAddresses.includes(to)) {
                defi++;
            }

            // Contract deployment detection
            if (tx.to === '' && tx.contractAddress !== '') {
                deployed++;
            }
        });

        return NextResponse.json({
            txCount,
            daysActive: uniqueDays.size,
            longestStreak,
            bridge,
            defi,
            deployed,
            walletAge,
        });

    } catch (error: any) {
        console.error('Etherscan API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch Etherscan data', details: error.message },
            { status: 500 }
        );
    }
}
