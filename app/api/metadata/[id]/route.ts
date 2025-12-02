import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { getEtherscanData, getNeynarData, getBasenameData } from '../../lib/api-helpers';

const client = createPublicClient({
    chain: base,
    transport: http(),
});

const CONTRACT = '0x66fADf7f93A4407DD336C35cD09ccDA58559442b';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const tokenId = params.id;

    try {
        // 1. Get Owner of Token
        let owner = '';
        try {
            owner = await client.readContract({
                address: CONTRACT,
                abi: parseAbi(['function ownerOf(uint256) view returns (address)']),
                functionName: 'ownerOf',
                args: [BigInt(tokenId)],
            });
        } catch (e) {
            return NextResponse.json({ error: 'Token not found' }, { status: 404 });
        }

        // 2. Fetch Live Data for Owner using shared helpers
        const [neynarData, etherscanData, basenameData] = await Promise.all([
            getNeynarData(owner),
            getEtherscanData(owner),
            getBasenameData(owner)
        ]);

        // 3. Construct Image URL Params
        const imgParams = new URLSearchParams();

        if (neynarData) {
            imgParams.append('username', neynarData.username || 'Explorer');
            imgParams.append('pfp', neynarData.pfp || '');
            imgParams.append('fid', (neynarData.fid || 0).toString());
            imgParams.append('score', (neynarData.score || 0).toString());
            imgParams.append('isVerified', neynarData.isVerified ? 'true' : 'false');
        }

        if (etherscanData) {
            imgParams.append('txCount', (etherscanData.txCount || 0).toString());
            imgParams.append('daysActive', (etherscanData.daysActive || 0).toString());
            imgParams.append('walletAge', (etherscanData.walletAge || 0).toString());
            imgParams.append('bridge', (etherscanData.bridge || 0).toString());
            imgParams.append('defi', (etherscanData.defi || 0).toString());
            imgParams.append('deployed', (etherscanData.deployed || 0).toString());
            imgParams.append('streak', (etherscanData.longestStreak || 0).toString());
        }

        if (basenameData && basenameData.basename) {
            imgParams.append('basename', basenameData.basename);
        }

        // Use absolute URL for image generation if possible, or relative
        const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const imageUrl = `${host}/api/image?${imgParams.toString()}`;

        // 4. Return Metadata
        return NextResponse.json({
            name: `BasePrint #${tokenId}`,
            description: `Onchain identity snapshot for ${neynarData?.username || owner}.`,
            image: imageUrl,
            attributes: [
                { trait_type: 'Neynar Score', value: neynarData?.score || 0 },
                { trait_type: 'Wallet Age', value: etherscanData?.walletAge || 0 },
                { trait_type: 'Active Days', value: etherscanData?.daysActive || 0 },
                { trait_type: 'TX Count', value: etherscanData?.txCount || 0 },
            ]
        });

    } catch (error: any) {
        console.error('Metadata Error:', error);
        return NextResponse.json({ error: 'Failed to generate metadata' }, { status: 500 });
    }
}
