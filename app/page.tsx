import { Metadata } from 'next';
import HomeContent from './components/HomeContent';

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = new URLSearchParams();

  // Pass through all search params to the OG image API
  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      params.append(key, value);
    }
  });

  // Default title and description
  const title = 'BasePrint';
  const description = 'Your onchain identity on Base.';

  // Construct the OG image URL
  // We use a relative URL here, Next.js handles the host automatically in most cases, 
  // but for Farcaster frames/embeds, an absolute URL is safer if we knew the host.
  // Since we are in a server component, we can try to infer or just use the relative path which Next.js resolves.
  // Ideally, we should use process.env.NEXT_PUBLIC_HOST or similar if available, but relative often works for Vercel deployments.
  // Let's use the Vercel URL if available, otherwise relative.
  const host = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://baseprint.vercel.app';
  const ogImageUrl = `${host}/api/og?${params.toString()}`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 800,
          alt: 'BasePrint Identity Card',
        },
      ],
    },
    other: {
      'fc:frame': 'vNext',
      'fc:frame:image': ogImageUrl,
      'fc:frame:button:1': 'Get your BasePrint',
      'fc:frame:button:1:action': 'link',
      'fc:frame:button:1:target': 'https://baseprint.vercel.app',
    },
  };
}

export default function Page() {
  return <HomeContent />;
}
