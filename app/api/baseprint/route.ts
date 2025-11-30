// app/api/baseprint/route.ts
import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY!;

// basit helper
function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing address parameter" },
      { status: 400 }
    );
  }

  try {
    // -------- 1) NEYNAR: wallet -> farcaster user --------
    let farcasterData: any = null;

    try {
      const neynarRes = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses[]=${address}`,
        {
          headers: {
            "X-API-KEY": NEYNAR_API_KEY,
            accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!neynarRes.ok) {
        console.error("Neynar error status:", neynarRes.status);
      } else {
        const neynarJson = await neynarRes.json();
        const user = neynarJson?.users?.[0];

        if (user) {
          farcasterData = {
            fid: user.fid,
            username: user.username,
            pfp: user.pfp_url,
            score: user.neynar_score ?? 0,
            isVerified: !!user.power_badge,
          };
        }
      }
    } catch (err) {
      console.error("Neynar fetch failed:", err);
    }

    // -------- 2) BASESCAN: tx list & stats --------
    let stats: any = {
      txCount: 0,
      daysActive: 0,
      walletAge: 0,
      bridge: 0,
      defi: 0,
      deployed: 0,
      longestStreak: 0,
      isVerified: farcasterData?.isVerified ?? false,
    };

    try {
      const baseRes = await fetch(
        `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${BASESCAN_API_KEY}`,
        { cache: "no-store" }
      );

      const baseJson = await baseRes.json();

      if (baseJson.status === "1" && Array.isArray(baseJson.result)) {
        const txs = baseJson.result;
        stats.txCount = txs.length;

        if (txs.length > 0) {
          const first = txs[0];
          const last = txs[txs.length - 1];

          const firstDate = new Date(parseInt(first.timeStamp, 10) * 1000);
          const lastDate = new Date(parseInt(last.timeStamp, 10) * 1000);
          const now = new Date();

          stats.walletAge = daysBetween(firstDate, now);

          // aktif gün sayısı = ilk tx ile son tx arasındaki günler
          stats.daysActive = daysBetween(firstDate, lastDate) + 1;

          // çok kaba streak hesabı (şimdilik placeholder)
          stats.longestStreak = Math.min(stats.daysActive, 30);
        }

        // bridge / defi / deployed gibi alanları
        // istediğinde daha detaylı hesaplarız, şimdilik 0 bırakıyoruz
      } else {
        console.error("BaseScan returned no txs:", baseJson);
      }
    } catch (err) {
      console.error("BaseScan fetch failed:", err);
    }

    if (!farcasterData) {
      return NextResponse.json(
        {
          error:
            "No Farcaster profile found for this address. Make sure your wallet is linked.",
          farcasterData: null,
          stats,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: null,
        farcasterData,
        stats,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("BasePrint API fatal error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
