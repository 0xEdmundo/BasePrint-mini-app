import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const tokenId = searchParams.get('tokenId');

    const host = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://baseprint.vercel.app';

    let imageUrl = `${host}/opengraph-image.png`;
    let buttonText = 'Mint BasePrint ID';
    let buttonTarget = 'https://baseprint.vercel.app';

    // If tokenId is present, fetch NFT metadata
    if (tokenId) {
        try {
            const res = await fetch(`${host}/api/metadata/${tokenId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.image) {
                    imageUrl = data.image;
                }
            }
        } catch (e) {
            console.error('Error fetching NFT metadata:', e);
        }

        buttonText = 'View my BasePrint ID';
        buttonTarget = `https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint?tokenId=${tokenId}`;
    }

    // Return HTML with Farcaster Frame metadata
    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="BasePrint – Onchain Identity Card" />
    <meta property="og:description" content="Turn your Farcaster profile into an onchain ID card" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:button:1" content="${buttonText}" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="${buttonTarget}" />
  </head>
  <body>
    <h1>BasePrint</h1>
    <p>Redirecting to app...</p>
    <script>
      window.location.href = '${buttonTarget}';
    </script>
  </body>
</html>`;

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
        },
    });
}
