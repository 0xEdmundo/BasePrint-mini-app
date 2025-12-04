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

  let ogImageUrl = 'https://mwpoimjhvrcx9ep4.public.blob.vercel-storage.com/URL%20Embed';

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
  // Create Mini App Embed for Farcaster
  const miniAppEmbed = {
    version: '1',
    imageUrl: searchParams.tokenId ? ogImageUrl : 'https://baseprint.vercel.app/embed-image.png',
    button: {
      title: 'Launch BasePrint',
      action: {
        type: 'launch_frame',
        name: 'BasePrint',
        url: searchParams.tokenId
          ? `https://baseprint.vercel.app/?tokenId=${searchParams.tokenId}`
          : 'https://baseprint.vercel.app',
        splashImageUrl: 'https://baseprint.vercel.app/embed-image.png',
        splashBackgroundColor: '#0052FF'
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
      siteName: "BasePrint",
      type: "website",
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
    },
    other: {
      // Farcaster Mini App Embed
      'fc:miniapp': JSON.stringify({
        ...miniAppEmbed,
        button: {
          ...miniAppEmbed.button,
          action: {
            ...miniAppEmbed.button.action,
            type: 'launch_miniapp'
          }
        }
      }),
      // Backward compatibility
      'fc:frame': JSON.stringify(miniAppEmbed),
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
