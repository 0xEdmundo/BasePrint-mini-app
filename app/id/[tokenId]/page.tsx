import { Metadata } from 'next';

const BASE_URL = 'https://baseprint.vercel.app';

type Props = {
    params: { tokenId: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { tokenId } = params;

    // Fetch metadata from our API
    let imageUrl = `${BASE_URL}/api/image?username=BasePrint&score=0.5`;
    let title = `BasePrint ID #${tokenId}`;
    const description = 'Your onchain identity card that combines your Farcaster presence, Neynar score, and Base wallet activity into a single immutable NFT.';

    try {
        const metadataRes = await fetch(`${BASE_URL}/api/metadata/${tokenId}`, {
            cache: 'no-store',
        });

        if (metadataRes.ok) {
            const metadata = await metadataRes.json();
            if (metadata.image) {
                imageUrl = metadata.image;
            }
            if (metadata.name) {
                title = metadata.name;
            }
        }
    } catch (error) {
        console.error('Error fetching metadata:', error);
    }

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [imageUrl],
            url: `${BASE_URL}/id/${tokenId}`,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [imageUrl],
        },
        other: {
            // Farcaster Frame metadata
            'fc:frame': 'vNext',
            'fc:frame:image': imageUrl,
            'fc:frame:button:1': 'View my BasePrint ID',
            'fc:frame:button:1:action': 'link',
            'fc:frame:button:1:target': `${BASE_URL}/?tokenId=${tokenId}`,
            'fc:frame:button:2': 'Mint your own',
            'fc:frame:button:2:action': 'link',
            'fc:frame:button:2:target': BASE_URL,
        },
    };
}

export default function NFTPage({ params }: Props) {
    const { tokenId } = params;

    // Redirect to main app with tokenId
    if (typeof window !== 'undefined') {
        window.location.href = `${BASE_URL}/?tokenId=${tokenId}`;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700">
            <div className="text-center text-white p-8">
                <div className="mb-4">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
                <h1 className="text-2xl font-bold mb-2">BasePrint ID #{tokenId}</h1>
                <p className="text-blue-100">Redirecting to BasePrint app...</p>
            </div>
        </div>
    );
}
