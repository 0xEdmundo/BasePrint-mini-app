import "@coinbase/onchainkit/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "BasePrint Identity",
  description:
    "Turn your Farcaster profile, Neynar score, and Base wallet activity into a single onchain ID card.",
  openGraph: {
    title: "BasePrint Identity",
    description:
      "Turn your Farcaster profile, Neynar score, and Base wallet activity into a single onchain ID card.",
    url: "https://baseprint.vercel.app",
    images: [
      {
        url: "https://baseprint.vercel.app/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "BasePrint Identity Card",
      },
    ],
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: 'https://baseprint.vercel.app/opengraph-image.png',
      button: {
        title: 'View BasePrint',
        action: {
          type: 'launch_frame',
          url: 'https://farcaster.xyz/miniapps/c_ODEPAqaSaM/baseprint'
        }
      }
    }),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
