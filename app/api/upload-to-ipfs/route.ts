import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { PinataSDK } from 'pinata';

// Initialize Redis with Vercel KV environment variables
const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
});

// Store IPFS CID for a token
export async function POST(req: NextRequest) {
    try {
        const PINATA_JWT = process.env.PINATA_JWT;
        const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

        if (!PINATA_JWT) {
            console.error('PINATA_JWT not configured');
            return NextResponse.json({ error: 'Pinata JWT not configured' }, { status: 500 });
        }

        console.log('Pinata JWT configured, initializing SDK...');

        const pinata = new PinataSDK({
            pinataJwt: PINATA_JWT,
            pinataGateway: PINATA_GATEWAY,
        });

        const { imageUrl, tokenId } = await req.json();
        console.log('Upload request for tokenId:', tokenId, 'imageUrl:', imageUrl);

        if (!imageUrl) {
            return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
        }

        // Check if we already have an IPFS CID for this token
        if (tokenId) {
            try {
                const existingCid = await redis.get(`nft:${tokenId}:ipfs`);
                if (existingCid) {
                    console.log('Found cached CID:', existingCid);
                    return NextResponse.json({
                        success: true,
                        cid: existingCid,
                        ipfsUrl: `ipfs://${existingCid}`,
                        gatewayUrl: `https://${PINATA_GATEWAY}/ipfs/${existingCid}`,
                        cached: true
                    });
                }
            } catch (e) {
                console.log('KV not available, uploading fresh:', e);
            }
        }

        // 1. Fetch the image from our image generation endpoint
        console.log('Fetching image from:', imageUrl);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            console.error('Failed to fetch image:', imageResponse.status, imageResponse.statusText);
            return NextResponse.json({ error: 'Failed to fetch image', status: imageResponse.status }, { status: 500 });
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        console.log('Image buffer size:', imageBuffer.byteLength);

        // 2. Create a File object from the buffer
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        const file = new File([blob], `baseprint-${tokenId || 'image'}.png`, { type: 'image/png' });

        // 3. Upload to Pinata using SDK
        console.log('Uploading to Pinata...');
        const upload = await pinata.upload.public.file(file);
        console.log('Pinata upload response:', upload);

        if (upload.cid) {
            const cid = upload.cid;

            // Store CID in Redis
            if (tokenId) {
                try {
                    await redis.set(`nft:${tokenId}:ipfs`, cid);
                    console.log('Stored CID in Redis for token:', tokenId);
                } catch (e) {
                    console.error('Could not cache to Redis:', e);
                }
            }

            return NextResponse.json({
                success: true,
                cid,
                ipfsUrl: `ipfs://${cid}`,
                gatewayUrl: `https://${PINATA_GATEWAY}/ipfs/${cid}`,
            });
        } else {
            console.error('Invalid response from Pinata:', upload);
            return NextResponse.json({ error: 'Invalid response from Pinata', data: upload }, { status: 500 });
        }

    } catch (error: any) {
        console.error('IPFS upload error:', error);
        return NextResponse.json({ error: 'IPFS upload failed', details: error.message }, { status: 500 });
    }
}

// Get IPFS CID for a token
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tokenId = searchParams.get('tokenId');
    const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

    if (!tokenId) {
        return NextResponse.json({ error: 'tokenId is required' }, { status: 400 });
    }

    try {
        const cid = await redis.get(`nft:${tokenId}:ipfs`);
        if (cid) {
            return NextResponse.json({
                success: true,
                cid,
                ipfsUrl: `ipfs://${cid}`,
                gatewayUrl: `https://${PINATA_GATEWAY}/ipfs/${cid}`,
            });
        } else {
            return NextResponse.json({ error: 'No IPFS data found for this token' }, { status: 404 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: 'Redis not available', details: e.message }, { status: 500 });
    }
}
