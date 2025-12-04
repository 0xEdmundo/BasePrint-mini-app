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
        type: 'launch_frame',
        url: 'https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint'
      }
    }
  };

  const miniAppMetaTag = `<meta property="fc:miniapp" content='${JSON.stringify(miniAppEmbed).replace(/'/g, "&#39;")}' />`;

  return (
    <html lang="en">
      <head dangerouslySetInnerHTML={{ __html: miniAppMetaTag }} />
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
