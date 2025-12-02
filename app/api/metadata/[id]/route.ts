import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { getEtherscanData, getNeynarData, getBasenameData } from '../../../lib/api-helpers';

const client = createPublicClient({
    chain: base,
    transport: http(),
});

const CONTRACT = '0x66fADf7f93A4407DD336C35cD09ccDA58559442b';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const tokenId = params.id;

    try {
        // 1. Read Core Identity Data from Contract (The "Snapshot" Truth)
        let statsData: [string, bigint, bigint, bigint, string] | null = null;
        let owner = '';

        try {
            const [statsRes, ownerRes] = await Promise.all([
                client.readContract({
                    address: CONTRACT,
                    abi: parseAbi([
                        'function stats(uint256) view returns (string username, uint256 neynarScore, uint256 txCount, uint256 daysActive, string mintDate)'
                    ]),
                    functionName: 'stats',
                    args: [BigInt(tokenId)],
                }),
                client.readContract({
                    address: CONTRACT,
                    abi: parseAbi(['function ownerOf(uint256) view returns (address)']),
                    functionName: 'ownerOf',
                    args: [BigInt(tokenId)],
                })
            ]);

            statsData = statsRes as [string, bigint, bigint, bigint, string];
            owner = ownerRes as string;

        } catch (e) {
            console.error('Contract read error:', e);
            return NextResponse.json({ error: 'Token not found or contract error' }, { status: 404 });
        }

        const [storedUsername, storedNeynarScore, storedTxCount, storedDaysActive, storedMintDate] = statsData;

        // 2. Fetch Rich Data from APIs
        const [neynarData, etherscanData, basenameData] = await Promise.all([
            getNeynarData(owner),
            getEtherscanData(owner),
            getBasenameData(owner)
        ]);

        // 3. Construct Image URL Params (Hybrid: Stored + Live)
        const imgParams = new URLSearchParams();

        // A. Stored Stats (Priority)
        imgParams.append('username', storedUsername || neynarData?.username || 'Explorer');
        imgParams.append('score', (Number(storedNeynarScore) / 100).toString());
        imgParams.append('txCount', storedTxCount.toString());
        imgParams.append('daysActive', storedDaysActive.toString());
        imgParams.append('date', storedMintDate);

        // B. Live/Rich Data (Complementary)
        imgParams.append('pfp', neynarData?.pfp || 'https://zora.co/assets/icon.png');
        imgParams.append('fid', (neynarData?.fid || 0).toString());
        imgParams.append('displayName', neynarData?.displayName || neynarData?.username || 'Explorer');
        imgParams.append('isVerified', neynarData?.isVerified ? 'true' : 'false');

        if (basenameData?.basename) {
            imgParams.append('basename', basenameData.basename);
        }

        if (etherscanData) {
            imgParams.append('walletAge', (etherscanData.walletAge || 0).toString());
            imgParams.append('bridgeToEth', (etherscanData.bridgeToEth || 0).toString());
            imgParams.append('bridgeFromEth', (etherscanData.bridgeFromEth || 0).toString());
            imgParams.append('defiLend', (etherscanData.defiLend || 0).toString());
            imgParams.append('defiBorrow', (etherscanData.defiBorrow || 0).toString());
            imgParams.append('defiSwap', (etherscanData.defiSwap || 0).toString());
            imgParams.append('defiStake', (etherscanData.defiStake || 0).toString());
            imgParams.append('deployed', (etherscanData.deployed || 0).toString());
            imgParams.append('longestStreak', (etherscanData.longestStreak || 0).toString());
            imgParams.append('currentStreak', (etherscanData.currentStreak || 0).toString());
        }

        // Use absolute URL for image generation
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        const host = process.env.VERCEL_URL ? process.env.VERCEL_URL : 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        const imageUrl = `${baseUrl}/api/image?${imgParams.toString()}`;

        // 4. Return Metadata with Complete Attributes
        return NextResponse.json({
            name: `BasePrint #${tokenId}`,
            description: `Onchain identity snapshot for ${storedUsername}. Minted on ${storedMintDate}. This NFT captures Farcaster profile data and Base chain activity at the moment of minting.`,
            image: imageUrl,
            external_url: `${baseUrl}`,
            attributes: [
                // Farcaster Identity
                { trait_type: 'FID', value: neynarData?.fid || 0 },
                { trait_type: 'Username', value: storedUsername },
                { trait_type: 'Display Name', value: neynarData?.displayName || storedUsername },
                { trait_type: 'Neynar Score', value: Number(storedNeynarScore) / 100 },
                { trait_type: 'Power Badge', value: neynarData?.isVerified ? 'Yes' : 'No' },

                // Wallet Info
                { trait_type: 'Wallet Address', value: owner },
                { trait_type: 'Wallet Age (Days)', value: etherscanData?.walletAge || 0 },

                // Activity Metrics
                { trait_type: 'Active Days', value: Number(storedDaysActive) },
                { trait_type: 'Total Transactions', value: Number(storedTxCount) },
                { trait_type: 'Current Streak (Days)', value: etherscanData?.currentStreak || 0 },
                { trait_type: 'Longest Streak (Days)', value: etherscanData?.longestStreak || 0 },

                // Bridge Activity
                { trait_type: 'Bridge: Base→ETH', value: etherscanData?.bridgeToEth || 0 },
                { trait_type: 'Bridge: ETH→Base', value: etherscanData?.bridgeFromEth || 0 },

                // DeFi Activity
                { trait_type: 'DeFi: Lending', value: etherscanData?.defiLend || 0 },
                { trait_type: 'DeFi: Borrowing', value: etherscanData?.defiBorrow || 0 },
                { trait_type: 'DeFi: Swapping', value: etherscanData?.defiSwap || 0 },
                { trait_type: 'DeFi: Staking', value: etherscanData?.defiStake || 0 },

                // Developer Activity
                { trait_type: 'Deployed Contracts', value: etherscanData?.deployed || 0 },

                // Mint Info
                { trait_type: 'Mint Date', value: storedMintDate },
            ]
        });

    } catch (error: any) {
        console.error('Metadata Error:', error);
        return NextResponse.json({ error: 'Failed to generate metadata' }, { status: 500 });
    }
}
