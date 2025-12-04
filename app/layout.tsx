import "@coinbase/onchainkit/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://baseprint.vercel.app"),
  title: "BasePrint Identity",
  description:
    "Turn your Farcaster profile, Neynar score, and Base wallet activity into a single onchain ID card.",
  openGraph: {
    title: "BasePrint Identity",
    description:
      "Turn your Farcaster profile, Neynar score, and Base wallet activity into a single onchain ID card.",
    url: "https://baseprint.vercel.app",
    siteName: "BasePrint",
    type: "website",
    images: [
      {
        url: "https://mwpoimjhvrcx9ep4.public.blob.vercel-storage.com/icon.png",
        width: 1200,
        height: 630,
        alt: "BasePrint Identity Card",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BasePrint Identity",
    description:
      "Turn your Farcaster profile, Neynar score, and Base wallet activity into a single onchain ID card.",
    images: ["https://mwpoimjhvrcx9ep4.public.blob.vercel-storage.com/icon.png"],
  },
  other: {
    "fc:frame": JSON.stringify({
      "version": "next",
      "imageUrl": "https://mwpoimjhvrcx9ep4.public.blob.vercel-storage.com/icon.png",
      "button": {
        "title": "Open BasePrint",
        "action": {
          "type": "launch_frame",
          "name": "BasePrint",
          "url": "https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint",
          "splashImageUrl": "https://mwpoimjhvrcx9ep4.public.blob.vercel-storage.com/icon.png",
          "splashBackgroundColor": "#0052FF"
        }
      }
    })
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Farcaster Mini App Embed metadata for base URL
  const miniAppEmbed = {
    version: '1',
    imageUrl: 'https://mwpoimjhvrcx9ep4.public.blob.vercel-storage.com/URL%20Embed',
    button: {
      title: 'View BasePrint',
      action: {
        type: 'link',
        url: 'https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint'
      }
    }
  };

  const frameImageUrl = 'https://mwpoimjhvrcx9ep4.public.blob.vercel-storage.com/URL%20Embed';

  const miniAppMetaTag = `
    <meta property="fc:miniapp" content='${JSON.stringify(miniAppEmbed).replace(/'/g, "&#39;")}' />
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${frameImageUrl}" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:button:1" content="Open BasePrint" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint" />
    <meta property="og:image" content="${frameImageUrl}" />
  `;

  return (
    <html lang="en">
      <head dangerouslySetInnerHTML={{ __html: miniAppMetaTag }} />
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
