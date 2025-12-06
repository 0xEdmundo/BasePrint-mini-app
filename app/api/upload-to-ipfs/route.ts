import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const NFT_STORAGE_KEY = process.env.NFT_STORAGE_KEY || '';

// Initialize Redis from environment variables
const redis = Redis.fromEnv();

// Store IPFS CID for a token
export async function POST(req: NextRequest) {
    try {
        if (!NFT_STORAGE_KEY) {
            return NextResponse.json({ error: 'NFT_STORAGE_KEY not configured' }, { status: 500 });
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
                        gatewayUrl: `https://nftstorage.link/ipfs/${existingCid}`,
                        cached: true
                    });
                }
            } catch (e) {
                // KV might not be set up, continue with upload
                console.log('KV not available, uploading fresh');
            }
        }

        // 1. Fetch the image from our image generation endpoint
        console.log('Fetching image from:', imageUrl);
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch image', status: imageResponse.status }, { status: 500 });
        }

        const imageBlob = await imageResponse.blob();
        console.log('Image blob size:', imageBlob.size);

        // 2. Upload to NFT.Storage
        const uploadResponse = await fetch('https://api.nft.storage/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NFT_STORAGE_KEY}`,
            },
            body: imageBlob,
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('NFT.Storage upload failed:', errorText);
            return NextResponse.json({ error: 'Failed to upload to IPFS', details: errorText }, { status: 500 });
        }

        const uploadData = await uploadResponse.json();
        console.log('NFT.Storage response:', uploadData);

        // NFT.Storage returns { ok: true, value: { cid: "...", ... } }
        if (uploadData.ok && uploadData.value?.cid) {
            const cid = uploadData.value.cid;

            // Store CID in KV if available and tokenId provided
            if (tokenId) {
                try {
                    await redis.set(`nft:${tokenId}:ipfs`, cid);
                } catch (e) {
                    console.log('Could not cache to KV:', e);
                }
            }

            return NextResponse.json({
                success: true,
                cid,
                ipfsUrl: `ipfs://${cid}`,
                gatewayUrl: `https://nftstorage.link/ipfs/${cid}`,
            });
        } else {
            return NextResponse.json({ error: 'Invalid response from NFT.Storage', data: uploadData }, { status: 500 });
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
                gatewayUrl: `https://nftstorage.link/ipfs/${cid}`,
            });
        } else {
            return NextResponse.json({ error: 'No IPFS data found for this token' }, { status: 404 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: 'KV not available', details: e.message }, { status: 500 });
    }
}
