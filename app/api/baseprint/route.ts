import { NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY!;
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY!;

// -----------------------------
// Helper: Analyze Transaction Categories
// -----------------------------
function analyzeTransactions(txs: any[]) {
  let bridge = 0;
  let defi = 0;
  let deployed = 0;

  for (const tx of txs) {
    const input = tx.input?.toLowerCase() || "";

    if (input.includes("0x5f") || input.includes("bridge")) bridge++;
    if (
      input.includes("swap") ||
      input.includes("aave") ||
      input.includes("compound") ||
      input.includes("stake")
    )
      defi++;
    if (tx.contractAddress && tx.to === "") deployed++;
  }

  return { bridge, defi, deployed };
}

// -----------------------------
// Helper: Calculate Active Days Streak
// -----------------------------
function calculateStreak(dateStrings: string[]) {
  const dates = dateStrings
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const diff =
      (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      current++;
    } else {
      longest = Math.max(longest, current);
      current = 1;
    }
  }

  return Math.max(longest, current);
}

// -----------------------------
// Helper: Wallet Age
// -----------------------------
function calculateWalletAgeDays(firstTxTimestamp: number) {
  if (!firstTxTimestamp) return 0;
  const first = new Date(firstTxTimestamp * 1000);
  const now = new Date();
  return Math.floor((now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
}

// -----------------------------
// MAIN API ROUTE
// -----------------------------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Missing address parameter" },
        { status: 400 }
      );
    }

    // -----------------------------
    // 1) NEYNAR USER LOOKUP BY WALLET
    // -----------------------------
    const neynarRes = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: { "api-key": NEYNAR_API_KEY },
      }
    );

    const neynarJson = await neynarRes.json();

    let userData = null;

    if (
      neynarJson?.users &&
      Array.isArray(neynarJson.users[address]) &&
      neynarJson.users[address].length > 0
    ) {
      const u = neynarJson.users[address][0];

      userData = {
        fid: u.fid || 0,
        username: u.username || "Explorer",
        pfp: u.pfp_url || "",
        score: u.farcaster_score || 0,
      };
    } else {
      // fallback for unknown user
      userData = {
        fid: 0,
        username: "Explorer",
        pfp: "",
        score: 0,
      };
    }

    // -----------------------------
    // 2) BASESCAN TX HISTORY
    // -----------------------------
    const txRes = await fetch(
      `https://api.basescan.org/api?module=account&action=txlist&address=${address}&sort=asc&apikey=${BASESCAN_API_KEY}`
    );
    const txJson = await txRes.json();

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

      // -----------------------------
      // 3) BALANCE CHECK (BigInt FIX)
      // -----------------------------
      const balRes = await fetch(
        `https://api.basescan.org/api?module=account&action=balance&address=${address}&apikey=${BASESCAN_API_KEY}`
      );

      const balJson = await balRes.json();
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

    // -----------------------------
    // FINAL RESPONSE
    // -----------------------------
    return NextResponse.json({
      farcasterData: userData,
      stats,
    });
  } catch (err: any) {
    console.error("SERVER ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal API Error" },
      { status: 500 }
    );
  }
}
