import "@coinbase/onchainkit/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "BasePrint – Onchain Identity Card",
  description:
    "Turn your Farcaster profile, Neynar score, and Base wallet activity into a single onchain ID card.",
  openGraph: {
    title: "BasePrint – Onchain Identity Card",
    description:
      "Turn your Farcaster profile, Neynar score, and Base wallet activity into a single onchain ID card.",
    url: "https://baseprint.vercel.app",
    images: [
      {
        url: "https://baseprint.vercel.app/opengraph-image.png",
      },
    ],
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
