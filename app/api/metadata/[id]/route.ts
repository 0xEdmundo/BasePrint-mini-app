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
        // Try to read from contract first
        let owner = '';
        let storedUsername = '';
        let storedNeynarScore = BigInt(0);
        let storedTxCount = BigInt(0);
        let storedDaysActive = BigInt(0);
        let storedMintDate = '';
        let hasContractData = false;

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

            const statsData = statsRes as [string, bigint, bigint, bigint, string];
            owner = ownerRes as string;

            [storedUsername, storedNeynarScore, storedTxCount, storedDaysActive, storedMintDate] = statsData;

            // Check if we have valid data (username is not empty)
            if (storedUsername && storedUsername.trim() !== '') {
                hasContractData = true;
            }

        } catch (e) {
            console.log('Contract read failed, will use live data:', e);
            // If contract read fails, we'll use live data below
        }

        // If no contract data, we need an address parameter
        if (!hasContractData && !owner) {
            const { searchParams } = new URL(req.url);
            const addressParam = searchParams.get('address');

            if (!addressParam) {
                return NextResponse.json({
                    error: 'Token not minted yet or address parameter required',
                    hint: 'Use: /api/metadata/[id]?address=0x...'
                }, { status: 404 });
            }

            owner = addressParam;
        }

        // Fetch live data from APIs
        const [neynarData, etherscanData, basenameData] = await Promise.all([
            getNeynarData(owner),
            getEtherscanData(owner),
            getBasenameData(owner)
        ]);

        // Construct Image URL Params
        const imgParams = new URLSearchParams();

        // Use stored data if available, otherwise use live data
        if (hasContractData) {
            imgParams.append('username', storedUsername);
            imgParams.append('score', (Number(storedNeynarScore) / 100).toString());
            imgParams.append('txCount', storedTxCount.toString());
            imgParams.append('daysActive', storedDaysActive.toString());
            imgParams.append('date', storedMintDate);
        } else {
            imgParams.append('username', neynarData?.username || 'Explorer');
            imgParams.append('score', (neynarData?.score || 0.5).toString());
            imgParams.append('txCount', (etherscanData?.txCount || 0).toString());
            imgParams.append('daysActive', (etherscanData?.daysActive || 0).toString());
            imgParams.append('date', new Date().toISOString().split('T')[0]);
        }

        // Live/Rich Data (always from APIs)
        imgParams.append('displayName', neynarData?.displayName || neynarData?.username || 'Explorer');
        imgParams.append('pfp', neynarData?.pfp || 'https://zora.co/assets/icon.png');
        imgParams.append('fid', (neynarData?.fid || 0).toString());
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

        // Determine username and mint date for metadata
        const finalUsername = hasContractData ? storedUsername : (neynarData?.username || 'Explorer');
        const finalMintDate = hasContractData ? storedMintDate : new Date().toISOString().split('T')[0];

        // Return Metadata with Complete Attributes
        return NextResponse.json({
            name: `BasePrint #${tokenId}`,
            description: `Onchain identity snapshot for ${finalUsername}. ${hasContractData ? `Minted on ${finalMintDate}.` : 'Live preview.'} This NFT captures Farcaster profile data and Base chain activity.`,
            image: imageUrl,
            external_url: `${baseUrl}`,
            attributes: [
                // Farcaster Identity
                { trait_type: 'FID', value: neynarData?.fid || 0 },
                { trait_type: 'Username', value: finalUsername },
                { trait_type: 'Display Name', value: neynarData?.displayName || finalUsername },
                { trait_type: 'Neynar Score', value: hasContractData ? Number(storedNeynarScore) / 100 : (neynarData?.score || 0.5) },
                { trait_type: 'Power Badge', value: neynarData?.isVerified ? 'Yes' : 'No' },

                // Wallet Info
                { trait_type: 'Wallet Address', value: owner },
                { trait_type: 'Wallet Age (Days)', value: etherscanData?.walletAge || 0 },

                // Activity Metrics
                { trait_type: 'Active Days', value: hasContractData ? Number(storedDaysActive) : (etherscanData?.daysActive || 0) },
                { trait_type: 'Total Transactions', value: hasContractData ? Number(storedTxCount) : (etherscanData?.txCount || 0) },
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
                { trait_type: 'Mint Date', value: finalMintDate },
                { trait_type: 'Data Source', value: hasContractData ? 'On-chain Snapshot' : 'Live Data' },
            ]
        });

    } catch (error: any) {
        console.error('Metadata Error:', error);
        return NextResponse.json({ error: 'Failed to generate metadata', details: error.message }, { status: 500 });
    }
}
