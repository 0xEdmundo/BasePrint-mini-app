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
  // Ensure we have a valid protocol
  const vercelUrl = process.env.VERCEL_URL;
  const host = vercelUrl ? `https://${vercelUrl}` : 'https://baseprint.vercel.app';
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
      'fc:frame:button:1': 'Mint BasePrint ID',
      'fc:frame:button:1:action': 'link',
      'fc:frame:button:1:target': 'https://baseprint.vercel.app',
    },
  };
}

export default function Page() {
  return <HomeContent />;
}
