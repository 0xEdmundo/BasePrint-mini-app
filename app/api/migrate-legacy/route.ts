import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { PinataSDK } from 'pinata';

// Initialize Redis
const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
});

// Legacy token IDs that need migration
const LEGACY_TOKENS = [55, 28, 51, 54, 27, 53, 52, 44, 26, 25, 42, 43, 46, 45, 47];

export async function POST(req: NextRequest) {
    try {
        // Check for admin secret to prevent unauthorized access
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');

        if (secret !== process.env.MIGRATION_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const PINATA_JWT = process.env.PINATA_JWT;
        const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

        if (!PINATA_JWT) {
            return NextResponse.json({ error: 'PINATA_JWT not configured' }, { status: 500 });
        }

        const pinata = new PinataSDK({
            pinataJwt: PINATA_JWT,
            pinataGateway: PINATA_GATEWAY,
        });

        const host = 'https://baseprint.vercel.app';
        const results: { tokenId: number; status: string; cid?: string; error?: string }[] = [];

        for (const tokenId of LEGACY_TOKENS) {
            try {
                // Check if already migrated
                const existingCid = await redis.get(`nft:${tokenId}:ipfs`);
                if (existingCid) {
                    results.push({ tokenId, status: 'already_migrated', cid: existingCid as string });
                    continue;
                }

                // Get metadata to build image URL
                console.log(`Fetching metadata for token ${tokenId}...`);
                const metadataRes = await fetch(`${host}/api/metadata/${tokenId}`);
                const metadata = await metadataRes.json();

                // The image URL in metadata is the dynamic URL
                const imageUrl = metadata.image;
                if (!imageUrl) {
                    results.push({ tokenId, status: 'error', error: 'No image URL in metadata' });
                    continue;
                }

                // Fetch the image
                console.log(`Fetching image for token ${tokenId}...`);
                const imageResponse = await fetch(imageUrl);
                if (!imageResponse.ok) {
                    results.push({ tokenId, status: 'error', error: `Failed to fetch image: ${imageResponse.status}` });
                    continue;
                }

                const imageBuffer = await imageResponse.arrayBuffer();

                // Upload to Pinata
                console.log(`Uploading token ${tokenId} to Pinata...`);
                const blob = new Blob([imageBuffer], { type: 'image/png' });
                const file = new File([blob], `baseprint-${tokenId}.png`, { type: 'image/png' });
                const upload = await pinata.upload.public.file(file);

                if (upload.cid) {
                    // Store in Redis
                    await redis.set(`nft:${tokenId}:ipfs`, upload.cid);
                    results.push({ tokenId, status: 'migrated', cid: upload.cid });
                    console.log(`Token ${tokenId} migrated successfully: ${upload.cid}`);
                } else {
                    results.push({ tokenId, status: 'error', error: 'No CID returned from Pinata' });
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (e: any) {
                results.push({ tokenId, status: 'error', error: e.message });
            }
        }

        return NextResponse.json({
            success: true,
            migrated: results.filter(r => r.status === 'migrated').length,
            alreadyMigrated: results.filter(r => r.status === 'already_migrated').length,
            errors: results.filter(r => r.status === 'error').length,
            results
        });

    } catch (error: any) {
        console.error('Migration error:', error);
        return NextResponse.json({ error: 'Migration failed', details: error.message }, { status: 500 });
    }
}

// GET to check status
export async function GET(req: NextRequest) {
    const results: { tokenId: number; hasCid: boolean; cid?: string }[] = [];

    for (const tokenId of LEGACY_TOKENS) {
        const cid = await redis.get(`nft:${tokenId}:ipfs`);
        results.push({
            tokenId,
            hasCid: !!cid,
            cid: cid as string | undefined
        });
    }

    return NextResponse.json({
        total: LEGACY_TOKENS.length,
        migrated: results.filter(r => r.hasCid).length,
        pending: results.filter(r => !r.hasCid).length,
        results
    });
}
