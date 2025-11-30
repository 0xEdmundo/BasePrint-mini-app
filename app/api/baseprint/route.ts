// app/api/baseprint/route.ts
import { NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || "";
const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || "";

type NeynarUser = {
  fid: number;
  username: string;
  pfp_url: string;
  created_at?: number;
  score?: number;
};

// --- Helpers ---

function calculateStreak(uniqueDates: string[]): number {
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
}

function calculateWalletAgeDays(firstTxTimestamp: number): number {
  if (!firstTxTimestamp) return 0;
  const now = Date.now();
  const firstDate = firstTxTimestamp * 1000;
  const diffTime = Math.abs(now - firstDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function analyzeTransactions(txs: any[]) {
  let bridge = 0;
  let deployed = 0;
  let interactions = 0;

  const BRIDGE_METHODS = [
    "0x32b7006d",
    "0x49228978",
    "0x5cae9c06",
    "0x9a2ac9d9",
  ];

  txs.forEach((tx) => {
    if (!tx.to || tx.to === "") {
      deployed++;
      return;
    }

    const method =
      tx.methodId ||
      (tx.input && tx.input.length >= 10 ? tx.input.substring(0, 10) : null);

    if (method && method !== "0x") {
      interactions++;
      if (BRIDGE_METHODS.includes(method)) {
        bridge++;
      }
    }
  });

  // DeFi: köprü dışındaki etkileşimlerden kabaca türetiyoruz
  const defi = Math.max(0, Math.floor((interactions - bridge) * 0.4));

  return { bridge, defi, deployed };
}

// --- API Handler ---

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing address" },
      { status: 400 }
    );
  }

  const lowerAddress = address.toLowerCase();

  let farcasterData: {
    username: string;
    pfp: string;
    score: number;
    fid: number;
    since: string;
  } | null = null;

  let stats:
    | {
        txCount: number;
        daysActive: number;
        longestStreak: number;
        bridge: number;
        defi: number;
        deployed: number;
        walletAge: number;
        isVerified: boolean;
      }
    | null = null;

  try {
    // 1) NEYNAR - adres -> Farcaster user
    if (NEYNAR_API_KEY) {
      const neynarRes = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${lowerAddress}`,
        {
          headers: {
            accept: "application/json",
            api_key: NEYNAR_API_KEY,
          },
          cache: "no-store",
        }
      );

      const neynarJson = await neynarRes.json();
      const addrKey =
        neynarJson[lowerAddress] ||
        neynarJson[address] ||
        neynarJson[lowerAddress.toLowerCase()];
      const users: NeynarUser[] = Array.isArray(addrKey) ? addrKey : [];

      const u = users[0];

      if (u) {
        farcasterData = {
          username: u.username,
          pfp: u.pfp_url,
          score: typeof u.score === "number" ? u.score : 0,
          fid: u.fid,
          since: u.created_at
            ? new Date(u.created_at * 1000).getFullYear().toString()
            : "",
        };
      }
    }

    // 2) ETHERSCAN - Base chain tx + balance
    if (ETHERSCAN_API_KEY) {
      const baseUrl = "https://api.etherscan.io/v2/api";
      const common = `chainid=8453&apikey=${ETHERSCAN_API_KEY}`;

      const txRes = await fetch(
        `${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&${common}`,
        { cache: "no-store" }
      );
      const txJson = await txRes.json();

      const balRes = await fetch(
        `${baseUrl}?module=account&action=balance&address=${address}&tag=latest&${common}`,
        { cache: "no-store" }
      );
      const balJson = await balRes.json();

      if (Array.isArray(txJson.result) && txJson.result.length > 0) {
        const txs = txJson.result as any[];

        const uniqueDates = Array.from(
          new Set(
            txs.map((tx) =>
              new Date(Number(tx.timeStamp) * 1000).toDateString()
            )
          )
        ) as string[];

        const analysis = analyzeTransactions(txs);
        const firstTs = Number(txs[0].timeStamp) || 0;
        const walletAge = calculateWalletAgeDays(firstTs);

        const balanceRaw = BigInt(balJson.result || "0");
        const hasBalance = balanceRaw > BigInt(0);
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
    }

    return NextResponse.json({
      farcasterData,
      stats,
    });
  } catch (err) {
    console.error("BasePrint API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
