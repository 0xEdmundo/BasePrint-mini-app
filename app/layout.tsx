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
        url: "https://mwpoimjhvrcx9ep4.public.blob.vercel-storage.com/URL%20Embed",
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
    images: ["https://mwpoimjhvrcx9ep4.public.blob.vercel-storage.com/URL%20Embed"],
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

  const miniAppMetaTag = `
    <meta property="fc:miniapp" content='${JSON.stringify(miniAppEmbed).replace(/'/g, "&#39;")}' />
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="https://mwpoimjhvrcx9ep4.public.blob.vercel-storage.com/URL%20Embed" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:button:1" content="View BasePrint" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint" />
    <meta property="fc:frame:post_url" content="https://baseprint.vercel.app/api/frame" />
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
