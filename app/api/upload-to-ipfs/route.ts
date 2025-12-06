import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const PINATA_JWT = process.env.PINATA_JWT || '';

// Initialize Redis with Vercel KV environment variables
const redis = new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
});

// Store IPFS CID for a token
export async function POST(req: NextRequest) {
    try {
        if (!PINATA_JWT) {
            console.error('PINATA_JWT not configured');
            return NextResponse.json({ error: 'Pinata JWT not configured' }, { status: 500 });
        }

        const { imageUrl, tokenId } = await req.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
        }

        // Check if we already have an IPFS CID for this token
        if (tokenId) {
            try {
                const existingCid = await redis.get(`nft:${tokenId}:ipfs`);
                if (existingCid) {
                    return NextResponse.json({
                        success: true,
                        cid: existingCid,
                        ipfsUrl: `ipfs://${existingCid}`,
                        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${existingCid}`,
                        cached: true
                    });
                }
            } catch (e) {
                console.log('KV not available, uploading fresh');
            }
        }

        // 1. Fetch the image from our image generation endpoint
        console.log('Fetching image from:', imageUrl);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            console.error('Failed to fetch image:', imageResponse.status);
            return NextResponse.json({ error: 'Failed to fetch image', status: imageResponse.status }, { status: 500 });
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        console.log('Image buffer size:', imageBuffer.byteLength);

        // 2. Upload to Pinata using JWT
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        formData.append('file', blob, `baseprint-${tokenId || 'image'}.png`);

        // Add metadata
        const metadata = JSON.stringify({
            name: `BasePrint NFT #${tokenId || 'unknown'}`,
        });
        formData.append('pinataMetadata', metadata);

        console.log('Uploading to Pinata...');
        const uploadResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PINATA_JWT}`,
            },
            body: formData,
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Pinata upload failed:', errorText);
            return NextResponse.json({ error: 'Failed to upload to IPFS', details: errorText }, { status: 500 });
        }

        const uploadData = await uploadResponse.json();
        console.log('Pinata response:', uploadData);

        // Pinata returns { IpfsHash: "...", PinSize: ..., Timestamp: "..." }
        if (uploadData.IpfsHash) {
            const cid = uploadData.IpfsHash;

            // Store CID in KV if available and tokenId provided
            if (tokenId) {
                try {
                    await redis.set(`nft:${tokenId}:ipfs`, cid);
                    console.log('Stored CID in Redis:', cid);
                } catch (e) {
                    console.log('Could not cache to KV:', e);
                }
            }

            return NextResponse.json({
                success: true,
                cid,
                ipfsUrl: `ipfs://${cid}`,
                gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
            });
        } else {
            return NextResponse.json({ error: 'Invalid response from Pinata', data: uploadData }, { status: 500 });
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
                gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
            });
        } else {
            return NextResponse.json({ error: 'No IPFS data found for this token' }, { status: 404 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: 'KV not available', details: e.message }, { status: 500 });
    }
}
