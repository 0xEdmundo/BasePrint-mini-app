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
        let identityData: [string, bigint, bigint, bigint, string] | null = null;
        let owner = '';

        try {
            // Parallel fetch for efficiency
            const [identityRes, ownerRes] = await Promise.all([
                client.readContract({
                    address: CONTRACT,
                    abi: parseAbi([
                        'function identities(uint256) view returns (string username, uint256 score, uint256 txCount, uint256 daysActive, string mintDate)'
                    ]),
                    functionName: 'identities',
                    args: [BigInt(tokenId)],
                }),
                client.readContract({
                    address: CONTRACT,
                    abi: parseAbi(['function ownerOf(uint256) view returns (address)']),
                    functionName: 'ownerOf',
                    args: [BigInt(tokenId)],
                })
            ]);

            identityData = identityRes as [string, bigint, bigint, bigint, string];
            owner = ownerRes as string;

        } catch (e) {
            console.error('Contract read error:', e);
            return NextResponse.json({ error: 'Token not found or contract error' }, { status: 404 });
        }

        const [storedUsername, storedScore, storedTxCount, storedDaysActive, storedMintDate] = identityData;

        // 2. Fetch Rich Data from APIs (to fill in the gaps: PFP, Bridge, DeFi, etc.)
        // We use the owner's address to fetch this.
        // NOTE: This data is "live" or "current", but combined with the stored "snapshot" stats.
        const [neynarData, etherscanData, basenameData] = await Promise.all([
            getNeynarData(owner),
            getEtherscanData(owner),
            getBasenameData(owner)
        ]);

        // 3. Construct Image URL Params (Hybrid: Stored + Live)
        const imgParams = new URLSearchParams();

        // A. Stored Stats (Priority)
        imgParams.append('username', storedUsername || neynarData?.username || 'Explorer');
        imgParams.append('score', (Number(storedScore) / 100).toString());
        imgParams.append('txCount', storedTxCount.toString());
        imgParams.append('daysActive', storedDaysActive.toString());
        imgParams.append('date', storedMintDate);

        // B. Live/Rich Data (Complementary)
        imgParams.append('pfp', neynarData?.pfp || 'https://zora.co/assets/icon.png');
        imgParams.append('fid', (neynarData?.fid || 0).toString());
        imgParams.append('isVerified', neynarData?.isVerified ? 'true' : 'false');

        if (basenameData?.basename) {
            imgParams.append('basename', basenameData.basename);
        }

        if (etherscanData) {
            // We use the live breakdown for these, as they aren't stored on-chain.
            // This is a reasonable compromise to have a rich card.
            imgParams.append('walletAge', (etherscanData.walletAge || 0).toString());
            imgParams.append('bridge', (etherscanData.bridge || 0).toString());
            imgParams.append('defi', (etherscanData.defi || 0).toString());
            imgParams.append('deployed', (etherscanData.deployed || 0).toString());
            imgParams.append('streak', (etherscanData.longestStreak || 0).toString());
        }

        // Use absolute URL for image generation
        // Ensure VERCEL_URL is handled correctly (it doesn't include https://)
        const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
        const host = process.env.VERCEL_URL ? process.env.VERCEL_URL : 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        const imageUrl = `${baseUrl}/api/image?${imgParams.toString()}`;

        // 4. Return Metadata
        return NextResponse.json({
            name: `BasePrint #${tokenId}`,
            description: `Onchain identity snapshot for ${storedUsername}. Minted on ${storedMintDate}.`,
            image: imageUrl,
            external_url: `${baseUrl}`,
            attributes: [
                { trait_type: 'Username', value: storedUsername },
                { trait_type: 'Neynar Score', value: Number(storedScore) / 100 },
                { trait_type: 'TX Count', value: Number(storedTxCount) },
                { trait_type: 'Active Days', value: Number(storedDaysActive) },
                { trait_type: 'Mint Date', value: storedMintDate },
                { trait_type: 'Wallet Age', value: etherscanData?.walletAge || 0 },
                { trait_type: 'Bridge Activity', value: etherscanData?.bridge || 0 },
                { trait_type: 'DeFi Interactions', value: etherscanData?.defi || 0 },
            ]
        });

    } catch (error: any) {
        console.error('Metadata Error:', error);
        return NextResponse.json({ error: 'Failed to generate metadata' }, { status: 500 });
    }
}
