import { Metadata } from 'next';
import HomeContent from './components/HomeContent';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = new URLSearchParams();

  // Default title and description
  let title = 'BasePrint – Onchain Identity Card';
  let description = 'Turn your Farcaster profile, Neynar score, and Base wallet activity into a single onchain ID card.';

  // Construct the host URL
  const vercelUrl = process.env.VERCEL_URL;
  const host = vercelUrl ? `https://${vercelUrl}` : 'https://baseprint.vercel.app';

  let ogImageUrl = 'https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png';

  // 1. If tokenId is present, fetch specific NFT metadata
  if (searchParams.tokenId) {
    try {
      const res = await fetch(`${host}/api/metadata/${searchParams.tokenId}`, { next: { revalidate: 60 } });
      if (res.ok) {
        const data = await res.json();
        if (data.image) {
          ogImageUrl = data.image;
        }
        if (data.name) {
          title = data.name;
        }
        if (data.description) {
          description = data.description;
        }
      }
    } catch (e) {
      console.error('Error fetching metadata for OG:', e);
    }
  }
  // 2. Otherwise, use search params to generate dynamic preview (for live preview before minting)
  else {
    // Pass through all search params to the OG image API
    Object.entries(searchParams).forEach(([key, value]) => {
      if (typeof value === 'string') {
        params.append(key, value);
      }
    });

    // Only use dynamic OG if we actually have params
    // if (params.toString()) {
    //   ogImageUrl = `${host}/api/og?${params.toString()}`;
    // }
  }

  // Create Mini App Embed for Farcaster
  // Always return metadata to ensure Home URL Embed works
  const miniAppEmbed = {
    version: '1',
    imageUrl: searchParams.tokenId ? ogImageUrl : 'https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png',
    button: {
      title: 'View BasePrint',
      action: {
        type: 'launch_frame',
        url: searchParams.tokenId
          ? `https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint?tokenId=${searchParams.tokenId}`
          : 'https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint'
      }
    }
  };

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: `${host}${searchParams.tokenId ? `/?tokenId=${searchParams.tokenId}` : ''}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: 'BasePrint Identity Card',
        },
      ],
    },
    other: {
      // Required: og:image for Farcaster to recognize the frame
      'og:image': ogImageUrl,
      // Farcaster Mini App Embed (for dynamic NFT previews)
      'fc:miniapp': JSON.stringify(miniAppEmbed),
      // Farcaster Frame metadata (backward compatibility)
      'fc:frame': 'vNext',
      'fc:frame:image': ogImageUrl,
      'fc:frame:image:aspect_ratio': '1.91:1',
      'fc:frame:button:1': searchParams.tokenId ? 'View my BasePrint ID' : 'Mint BasePrint ID',
      'fc:frame:button:1:action': 'link',
      'fc:frame:button:1:target': searchParams.tokenId
        ? `https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint?tokenId=${searchParams.tokenId}`
        : 'https://baseprint.vercel.app',
    },
  };
}

import { Suspense } from 'react';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
