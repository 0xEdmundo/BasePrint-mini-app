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
        // 1. Read Identity Data from Contract (Snapshot)
        // Assuming mapping: identities(uint256) returns (username, score, txCount, daysActive, mintDate)
        const data = await client.readContract({
            address: CONTRACT,
            abi: parseAbi([
                'function identities(uint256) view returns (string username, uint256 score, uint256 txCount, uint256 daysActive, string mintDate)',
                'function ownerOf(uint256) view returns (address)'
            ]),
            functionName: 'identities',
            args: [BigInt(tokenId)],
        }) as [string, bigint, bigint, bigint, string];

        const [username, score, txCount, daysActive, mintDate] = data;

        // 2. Get Owner (for fallback or extra info if needed)
        let owner = '';
        try {
            owner = await client.readContract({
                address: CONTRACT,
                abi: parseAbi(['function ownerOf(uint256) view returns (address)']),
                functionName: 'ownerOf',
                args: [BigInt(tokenId)],
            }) as string;
        } catch (e) {
            console.warn('Token owner not found (might be burned or invalid)');
        }

        // 3. Construct Image URL Params using STORED data
        const imgParams = new URLSearchParams();
        imgParams.append('username', username || 'Explorer');
        imgParams.append('score', (Number(score) / 100).toString()); // Score is stored as uint (e.g. 85 for 0.85)
        imgParams.append('txCount', txCount.toString());
        imgParams.append('daysActive', daysActive.toString());
        imgParams.append('date', mintDate);

        // We might not have pfp/fid stored on-chain, so we might still need to fetch basic profile info
        // if we want the PFP in the image. The user said "card's snapshot with data".
        // The card has PFP. If PFP isn't on-chain, we must fetch it live or use a placeholder.
        // Let's fetch basic Neynar data just for PFP/FID if username exists.
        let pfp = '';
        let fid = '';
        let isVerified = 'false';

        if (username) {
            try {
                // Quick fetch for PFP/FID using username if possible, or owner address
                // Since we have owner address, let's use that to get current PFP
                const neynarData = await getNeynarData(owner);
                if (neynarData) {
                    pfp = neynarData.pfp;
                    fid = neynarData.fid.toString();
                    isVerified = neynarData.isVerified ? 'true' : 'false';
                }
            } catch (e) {
                console.warn('Failed to fetch PFP for snapshot');
            }
        }

        imgParams.append('pfp', pfp);
        imgParams.append('fid', fid);
        imgParams.append('isVerified', isVerified);

        // Use absolute URL for image generation
        const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
        const imageUrl = `${host}/api/image?${imgParams.toString()}`;

        // 4. Return Metadata
        return NextResponse.json({
            name: `BasePrint #${tokenId}`,
            description: `Onchain identity snapshot for ${username}. Minted on ${mintDate}.`,
            image: imageUrl,
            attributes: [
                { trait_type: 'Username', value: username },
                { trait_type: 'Neynar Score', value: Number(score) / 100 },
                { trait_type: 'TX Count', value: Number(txCount) },
                { trait_type: 'Active Days', value: Number(daysActive) },
                { trait_type: 'Mint Date', value: mintDate },
            ]
        });

    } catch (error: any) {
        console.error('Metadata Error:', error);
        return NextResponse.json({ error: 'Failed to generate metadata' }, { status: 500 });
    }
}
