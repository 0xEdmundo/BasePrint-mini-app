// app/api/baseprint/route.ts
import { NextResponse } from "next/server";

const NEYNAR_API_KEY =
  process.env.NEXT_PUBLIC_NEYNAR_API_KEY || process.env.NEYNAR_API_KEY || "";
const ETHERSCAN_API_KEY =
  process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "";

// --- Yardımcı fonksiyonlar (page.tsx ile aynı mantık) ---
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
  const now = Date.now();
  const firstDate = firstTxTimestamp * 1000;
  const diffTime = Math.abs(now - firstDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
        ["0x32b7006d", "0x49228978", "0x5cae9c06", "0x9a2ac9d9"].includes(method)
      )
        bridge++;
    }
  });

  const defi = Math.max(0, Math.floor((interactions - bridge) * 0.4));
  return { bridge, defi, deployed };
};

// --- API handler ---
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing address query param" },
      { status: 400 }
    );
  }

  // Default Farcaster data (Explorer fallback)
  let farcasterData = {
    username: "Explorer",
    pfp: "",
    score: 0,
    fid: 0,
    since: "2024",
  };

  try {
    // A. NEYNAR KULLANICI VERİSİ
    if (NEYNAR_API_KEY) {
      try {
        const neynarRes = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?addresses=${address}&viewer_fid=3`,
          {
            headers: {
              accept: "application/json",
              api_key: NEYNAR_API_KEY,
            },
            cache: "no-store",
          }
        );

        const neynarJson = await neynarRes.json();

        const user = neynarJson?.users?.[0];
        if (user) {
          // Debug için log – Vercel logs’dan görebilirsin
          console.log(
            "Neynar user sample:",
            JSON.stringify(user, null, 2)
          );

          // score alanı API’ye göre değişebilir; en yaygın isimleri deniyoruz
          const score =
            user.neynar_score ??
            user.score ??
            user.relevance_score ??
            0;

          farcasterData = {
            username: user.username || "Explorer",
            pfp: user.pfp_url || user.pfp?.url || "",
            score: Number(score) || 0,
            fid: user.fid || 0,
            since: user.created_at
              ? new Date(user.created_at).getFullYear().toString()
              : "2024",
          };
        }
      } catch (err) {
        console.error("Neynar fetch error:", err);
      }
    } else {
      console.warn("NEYNAR_API_KEY not set; using Explorer fallback.");
    }

    // B. ETHERSCAN V2 – BASE CHAIN TX & BALANCE
    let stats = {
      txCount: 0,
      daysActive: 0,
      longestStreak: 0,
      bridge: 0,
      defi: 0,
      deployed: 0,
      walletAge: 0,
      isVerified: false,
    };

    if (ETHERSCAN_API_KEY) {
      try {
        const txUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;
        const balUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;

        const [txRes, balRes] = await Promise.all([fetch(txUrl), fetch(balUrl)]);
        const txJson = await txRes.json();
        const balJson = await balRes.json();

        if (Array.isArray(txJson.result) && txJson.result.length > 0) {
          const txs = txJson.result;

          const uniqueDates = Array.from(
            new Set(
              txs.map((tx: any) =>
                new Date(parseInt(tx.timeStamp) * 1000).toDateString()
              )
            )
          ) as string[];

          const analysis = analyzeTransactions(txs);

          const firstTxTs = parseInt(txs[0]?.timeStamp || "0", 10);
          const walletAge = calculateWalletAgeDays(firstTxTs);

          const balanceRaw = BigInt(balJson.result || "0");
          const hasBalance = balanceRaw > 0n;
          const isVerified = txs.length > 5 && hasBalance;

          stats = {
            txCount: txs.length,
            daysActive: uniqueDates.length,
            longestStreak: calculateStreak(uniqueDates),
            bridge: analysis.bridge,
            defi: analysis.defi,
            deployed: analysis.deployed,
            walletAge,
            isVerified,
          };
        }
      } catch (err) {
        console.error("Etherscan fetch error:", err);
      }
    } else {
      console.warn("ETHERSCAN_API_KEY not set; tx stats will be zero.");
    }

    return NextResponse.json({ farcasterData, stats });
  } catch (err) {
    console.error("BasePrint API fatal error:", err);
    return NextResponse.json(
      { error: "Internal error in BasePrint API" },
      { status: 500 }
    );
  }
}
