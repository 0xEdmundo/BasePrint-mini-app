import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { tokenId: string } }) {
    const tokenId = params.tokenId;
    const host = 'https://baseprint.vercel.app';

    // Get the actual image URL from metadata (IPFS if available)
    let imageUrl = `${host}/api/image-redirect/${tokenId}`;
    try {
        const metadataRes = await fetch(`${host}/api/metadata/${tokenId}`);
        const metadata = await metadataRes.json();
        if (metadata.image) {
            imageUrl = metadata.image;
        }
    } catch (e) {
        console.log('Could not fetch metadata, using redirect URL');
    }

    // Create the MiniAppEmbed JSON
    const miniAppEmbed = {
        version: "1",
        imageUrl: imageUrl,
        button: {
            title: "Check BasePrint 🔵",
            action: {
                type: "launch_miniapp",
                url: host,
                name: "BasePrint",
                splashImageUrl: `${host}/splash-icon.png`,
                splashBackgroundColor: "#0052FF"
            }
        }
    };

    // For backward compatibility - fc:frame uses launch_frame
    const frameEmbed = {
        ...miniAppEmbed,
        button: {
            ...miniAppEmbed.button,
            action: {
                ...miniAppEmbed.button.action,
                type: "launch_frame"
            }
        }
    };

    const miniAppJson = JSON.stringify(miniAppEmbed);
    const frameJson = JSON.stringify(frameEmbed);

    // Return HTML with proper Mini App embed meta tags
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>BasePrint #${tokenId}</title>
    
    <!-- Open Graph -->
    <meta property="og:title" content="BasePrint #${tokenId}" />
    <meta property="og:description" content="Check out my onchain identity card!" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:url" content="${host}/api/nft-frame/${tokenId}" />
    
    <!-- Farcaster Mini App Embed -->
    <meta name="fc:miniapp" content='${miniAppJson}' />
    <!-- For backward compatibility -->
    <meta name="fc:frame" content='${frameJson}' />
</head>
<body>
    <h1>BasePrint #${tokenId}</h1>
    <p>Redirecting to BasePrint...</p>
    <script>
        window.location.href = 'https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint';
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
