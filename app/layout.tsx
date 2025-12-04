import "@coinbase/onchainkit/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";

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

export const metadata: Metadata = {
  title: "BasePrint Identity",
  description: "Turn your Farcaster profile, Neynar score, and Base wallet activity into a single onchain ID card.",
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
  }
};
