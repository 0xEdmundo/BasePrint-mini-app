import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
    chain: base,
    transport: http(),
});

const CONTRACT = '0x685Ea8972b1f3E63Ab7c8826f3B53CaCD4737bB2';

// Helper to fetch internal API data
async function fetchInternalApi(baseUrl: string, endpoint: string, params: Record<string, string>) {
    const url = new URL(`${baseUrl}${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    return res.json();
}

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

        // 2. Fetch Live Data for Owner
        // We need the host to call our own internal APIs
        const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

        const [neynarData, etherscanData, basenameData] = await Promise.all([
            fetchInternalApi(host, '/api/neynar', { address: owner }),
            fetchInternalApi(host, '/api/etherscan', { address: owner }),
            fetchInternalApi(host, '/api/basename', { address: owner })
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
