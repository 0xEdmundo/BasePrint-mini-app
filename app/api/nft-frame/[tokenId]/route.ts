import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { tokenId: string } }) {
    const tokenId = params.tokenId;
    const host = 'https://baseprint.vercel.app';

    // Get the NFT image URL
    const imageUrl = `${host}/api/image-redirect/${tokenId}`;

    // Mini App launch URL
    const miniAppUrl = 'https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint';

    // Return HTML with Frame meta tags
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>BasePrint #${tokenId}</title>
    
    <!-- Open Graph -->
    <meta property="og:title" content="BasePrint #${tokenId}" />
    <meta property="og:description" content="Check out my onchain identity card!" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${host}/api/nft-frame/${tokenId}" />
    
    <!-- Farcaster Frame -->
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:image:aspect_ratio" content="1:1" />
    <meta property="fc:frame:button:1" content="🚀 Launch BasePrint" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="${miniAppUrl}" />
</head>
<body>
    <h1>BasePrint #${tokenId}</h1>
    <p>Redirecting to BasePrint...</p>
    <script>
        window.location.href = '${miniAppUrl}';
    </script>
</body>
</html>`;

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
        },
    });
}
