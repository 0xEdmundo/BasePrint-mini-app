import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis
const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
});

// PUT: Manually set CID for a specific token
export async function PUT(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');

        if (secret !== process.env.MIGRATION_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { tokenId, cid } = await req.json();

        if (!tokenId || !cid) {
            return NextResponse.json({ error: 'tokenId and cid are required' }, { status: 400 });
        }

        // Get old CID for logging
        const oldCid = await redis.get(`nft:${tokenId}:ipfs`);

        // Set new CID
        await redis.set(`nft:${tokenId}:ipfs`, cid);

        return NextResponse.json({
            success: true,
            tokenId,
            oldCid: oldCid || null,
            newCid: cid,
            gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove CID for a specific token (will use dynamic API)
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        const tokenId = searchParams.get('tokenId');

        if (secret !== process.env.MIGRATION_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!tokenId) {
            return NextResponse.json({ error: 'tokenId query param is required' }, { status: 400 });
        }

        const oldCid = await redis.get(`nft:${tokenId}:ipfs`);
        await redis.del(`nft:${tokenId}:ipfs`);

        return NextResponse.json({
            success: true,
            tokenId: parseInt(tokenId),
            deletedCid: oldCid || null,
            message: 'Token will now use dynamic API'
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// GET: Check CID for a specific token
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tokenId = searchParams.get('tokenId');

    if (!tokenId) {
        return NextResponse.json({ error: 'tokenId query param is required' }, { status: 400 });
    }

    const cid = await redis.get(`nft:${tokenId}:ipfs`);

    return NextResponse.json({
        tokenId: parseInt(tokenId),
        hasCid: !!cid,
        cid: cid || null,
        gatewayUrl: cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : null
    });
}
