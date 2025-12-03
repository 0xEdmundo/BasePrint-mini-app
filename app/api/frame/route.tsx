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
        // Create Mini App Embed JSON
        const miniAppEmbed = {
            imageUrl: imageUrl,
            button: {
                title: buttonText,
                action: {
                    type: 'launch_miniapp',
                    url: buttonTarget,
                    name: 'BasePrint',
                    splashImageUrl: imageUrl
                }
            }
        };

        // Return HTML with Farcaster Mini App metadata
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BasePrint – Onchain Identity Card</title>
    
    <!-- Open Graph -->
    <meta property="og:title" content="BasePrint – Onchain Identity Card" />
    <meta property="og:description" content="Turn your Farcaster profile into an onchain ID card" />
    <meta property="og:image" content="${imageUrl}" />
    
    <!-- Farcaster Mini App -->
    <meta property="fc:miniapp" content='${JSON.stringify(miniAppEmbed)}' />
    
    <!-- Backward compatibility with Frames -->
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:button:1" content="${buttonText}" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="${buttonTarget}" />
</head>
<body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
    <div style="text-align: center; color: white;">
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">BasePrint</h1>
        <p style="font-size: 1.2rem; margin-bottom: 2rem;">Your onchain identity card</p>
        <a href="${buttonTarget}" style="background: white; color: #667eea; padding: 1rem 2rem; border-radius: 0.5rem; text-decoration: none; font-weight: bold; display: inline-block;">
            ${buttonText}
        </a>
    </div>
    <script>
        setTimeout(() => {
            window.location.href = '${buttonTarget}';
        }, 2000);
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
