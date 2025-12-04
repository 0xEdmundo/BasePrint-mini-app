import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const tokenId = params.id;

    try {
        // Use absolute URL for internal fetch
        const baseUrl = process.env.NODE_ENV === 'development'
            ? 'http://localhost:3000'
            : 'https://baseprint.vercel.app';

        // Fetch the metadata for this token, forwarding any query parameters (like address)
        const { search } = new URL(req.url);
        const metadataRes = await fetch(`${baseUrl}/api/metadata/${tokenId}${search}`);

        if (!metadataRes.ok) {
            return new Response('Metadata not found', { status: 404 });
        }

        const metadata = await metadataRes.json();

        if (!metadata.image) {
            return new Response('Image not found in metadata', { status: 404 });
        }

        // Redirect to the full image URL
        return NextResponse.redirect(metadata.image, 307);

    } catch (error: any) {
        console.error('Image Redirect Error:', error);
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
}
