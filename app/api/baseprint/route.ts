// app/api/baseprint/route.ts

import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

// --- Aynı mantık: streak hesaplama ---
const calculateStreak = (uniqueDates: string[]) => {
  if (!uniqueDates.length) return 0;
  const sortedDates = [...uniqueDates].sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  let longestStreak = 1;
  let currentStreak = 1;
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const d1 = new Date(sortedDates[i]);
    const d2 = new Date(sortedDates[i + 1]);
    const diffTime = Math.abs(d1.getTime() - d2.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      currentStreak++;
    } else {
      if (currentStreak > longestStreak) longestStreak = currentStreak;
      currentStreak = 1;
    }
  }
  if (currentStreak > longestStreak) longestStreak = currentStreak;
  return longestStreak;
};

const calculateWalletAgeDays = (firstTxTimestamp: number) => {
  if (!firstTxTimestamp) return 0;
  const now = new Date().getTime();
  const firstDate = new Date(firstTxTimestamp * 1000).getTime();
  const diffTime = Math.abs(now - firstDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const analyzeTransactions = (txs: any[]) => {
  let bridge = 0,
    deployed = 0,
    interactions = 0;
  txs.forEach((tx: any) => {
    if (!tx.to || tx.to === "") {
      deployed++;
      return;
    }
    const method =
      tx.methodId ||
      (tx.input && tx.input.length >= 10 ? tx.input.substring(0, 10) : null);
    if (method && method !== "0x") {
      interactions++;
      if (
        ["0x32b7006d", "0x49228978", "0x5cae9c06", "0x9a2ac9d9"].includes(
          method
        )
      )
        bridge++;
    }
  });
  const defi = Math.max(0, Math.floor((interactions - bridge) * 0.4));
  return { bridge, defi, deployed };
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  // Varsayılan Farcaster verisi (Neynar hata verirse)
  let farcasterData: any = {
    username: "Explorer",
    pfp: "",
    score: 0,
    fid: 0,
    since: "2024",
  };

  let stats: any = null;

  // ---- A) NEYNAR ----
  if (NEYNAR_API_KEY) {
    try {
      const neynarRes = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=&viewer_fid=3&addresses=${address}`,
        {
          headers: {
            api_key: NEYNAR_API_KEY,
            accept: "application/json",
          },
        }
      );

      const neynarJson = await neynarRes.json();

      if (neynarJson.users && neynarJson.users[0]) {
        const u = neynarJson.users[0];
        farcasterData = {
          username: u.username,
          pfp: u.pfp_url,
          score: u.score || 0.5,
          fid: u.fid,
          since: u.created_at
            ? new Date(u.created_at).getFullYear().toString()
            : "2024",
        };
      }
    } catch (e) {
      console.error("Neynar Error (Skipping):", e);
    }
  }

  // ---- B) ETHERSCAN V2 (Base chain id: 8453) ----
  if (ETHERSCAN_API_KEY) {
    try {
      const txUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
      const txRes = await fetch(txUrl);
      const txJson = await txRes.json();

      const balUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
      const balRes = await fetch(balUrl);
      const balJson = await balRes.json();

      if (txJson.result && Array.isArray(txJson.result)) {
        const txs = txJson.result;
        const uniqueDates = Array.from(
          new Set(
            txs.map((tx: any) =>
              new Date(parseInt(tx.timeStamp) * 1000).toDateString()
            )
          )
        ) as string[];

        const analysis = analyzeTransactions(txs);
        const isVerified = txs.length > 5 && parseInt(balJson.result) > 0;

        stats = {
          txCount: txs.length,
          daysActive: uniqueDates.length,
          longestStreak: calculateStreak(uniqueDates),
          bridge: analysis.bridge,
          defi: analysis.defi,
          deployed: analysis.deployed,
          walletAge: calculateWalletAgeDays(
            parseInt(txs[0]?.timeStamp || 0)
          ),
          isVerified,
        };
      }
    } catch (e) {
      console.error("Etherscan Error (Skipping):", e);
    }
  }

  return NextResponse.json({
    farcasterData,
    stats,
  });
}
