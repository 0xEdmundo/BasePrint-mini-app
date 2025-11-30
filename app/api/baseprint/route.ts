// app/api/baseprint/route.ts
import { NextRequest, NextResponse } from "next/server";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY; // Base için de buradan gidiyoruz

const ETHERSCAN_BASE_URL = "https://api.etherscan.io/v2/api";
const BASE_CHAIN_ID = "8453"; // Base mainnet

type EtherscanTx = {
  timeStamp: string;
  contractAddress?: string;
  functionName?: string;
};

function computeStats(txs: EtherscanTx[]) {
  if (!txs || txs.length === 0) {
    return {
      txCount: 0,
      daysActive: 0,
      walletAge: 0,
      bridge: 0,
      defi: 0,
      deployed: 0,
      longestStreak: 0,
    };
  }

  const dates = txs
    .map((tx) => new Date(parseInt(tx.timeStamp, 10) * 1000))
    .sort((a, b) => a.getTime() - b.getTime());

  const first = dates[0];
  const now = new Date();

  const msPerDay = 1000 * 60 * 60 * 24;
  const walletAge = Math.max(
    1,
    Math.round((now.getTime() - first.getTime()) / msPerDay)
  );

  // aktif gün sayısı (unique gün)
  const daySet = new Set(
    dates.map((d) => d.toISOString().split("T")[0]) // YYYY-MM-DD
  );
  const daysActive = daySet.size;

  // longest streak
  const sortedDays = Array.from(daySet).sort();
  let longestStreak = 1;
  let currentStreak = 1;

  const toDate = (s: string) => new Date(s + "T00:00:00Z");

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = toDate(sortedDays[i - 1]).getTime();
    const curr = toDate(sortedDays[i]).getTime();
    const diffDays = Math.round((curr - prev) / msPerDay);

    if (diffDays === 1) {
      currentStreak += 1;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else {
      currentStreak = 1;
    }
  }

  const deployed = txs.filter((tx) => !!tx.contractAddress).length;

  const bridge = txs.filter((tx) =>
    (tx.functionName || "")
      .toLowerCase()
      .match(/bridge|deposit|withdraw|l1|l2/)
  ).length;

  const defi = txs.filter((tx) =>
    (tx.functionName || "")
      .toLowerCase()
      .match(/stake|lend|borrow|supply|liquidity|farm|vault/)
  ).length;

  return {
    txCount: txs.length,
    daysActive,
    walletAge,
    bridge,
    defi,
    deployed,
    longestStreak,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Missing address" },
        { status: 400 }
      );
    }

    if (!NEYNAR_API_KEY) {
      console.error("NEYNAR_API_KEY is missing");
      return NextResponse.json(
        { error: "Server misconfigured (Neynar key missing)" },
        { status: 500 }
      );
    }

    // ---------- NEYNAR: cüzdandan Farcaster user çek ----------
    const neynarUrl = new URL(
      "https://api.neynar.com/v2/farcaster/user/bulk-by-address"
    );
    neynarUrl.searchParams.set("addresses", address);

    const neynarRes = await fetch(neynarUrl.toString(), {
      headers: {
        "x-api-key": NEYNAR_API_KEY,
        accept: "application/json",
      },
    });

    if (!neynarRes.ok) {
      console.error(
        "Neynar error:",
        neynarRes.status,
        await neynarRes.text()
      );
      return NextResponse.json(
        { error: "NO_FARCASTER_USER_FOR_ADDRESS" },
        { status: 404 }
      );
    }

    const neynarJson: any = await neynarRes.json();

    const usersArray: any[] =
      Array.isArray(neynarJson.users)
        ? neynarJson.users
        : Array.isArray(neynarJson.result?.users)
        ? neynarJson.result.users
        : neynarJson.result?.user
        ? [neynarJson.result.user]
        : [];

    const user = usersArray[0];

    if (!user) {
      return NextResponse.json(
        { error: "NO_FARCASTER_USER_FOR_ADDRESS" },
        { status: 404 }
      );
    }

    // pfp alanını sadece ?? ile zincirledim (|| yok artık)
    const pfp =
      (user as any).pfp_url ??
      (user as any).pfp?.url ??
      (user as any).pfp?.verified ??
      "";

    const isVerified =
      (Array.isArray(user.verifications) &&
        user.verifications.length > 0) ||
      (user.verified_addresses &&
        Array.isArray(user.verified_addresses.eth_addresses) &&
        user.verified_addresses.eth_addresses.length > 0) ||
      false;

    const score =
      typeof user.score === "number"
        ? user.score
        : typeof user.neynar_user_score === "number"
        ? user.neynar_user_score
        : typeof user.relevance_score === "number"
        ? user.relevance_score
        : 0;

    const farcasterData = {
      fid: user.fid,
      username: user.username,
      pfp,
      isVerified,
      score,
    };

    // ---------- ETHERSCAN (BASE) → cüzdan tx taraması ----------
    let stats = {
      txCount: 0,
      daysActive: 0,
      walletAge: 0,
      bridge: 0,
      defi: 0,
      deployed: 0,
      longestStreak: 0,
      isVerified,
    };

    if (ETHERSCAN_API_KEY) {
      const url = new URL(ETHERSCAN_BASE_URL);
      url.searchParams.set("apikey", ETHERSCAN_API_KEY);
      url.searchParams.set("chainid", BASE_CHAIN_ID);
      url.searchParams.set("module", "account");
      url.searchParams.set("action", "txlist");
      url.searchParams.set("address", address);
      url.searchParams.set("startblock", "0");
      url.searchParams.set("endblock", "9999999999");
      url.searchParams.set("page", "1");
      url.searchParams.set("offset", "10000");
      url.searchParams.set("sort", "asc");

      const txRes = await fetch(url.toString(), {
        headers: { accept: "application/json" },
      });

      if (txRes.ok) {
        const txJson: any = await txRes.json();
        if (txJson.status === "1" && Array.isArray(txJson.result)) {
          const baseStats = computeStats(txJson.result as EtherscanTx[]);
          stats = { ...baseStats, isVerified };
        } else {
          console.warn("Etherscan returned no txs:", txJson.message);
        }
      } else {
        console.error(
          "Etherscan error:",
          txRes.status,
          await txRes.text()
        );
      }
    } else {
      console.warn("ETHERSCAN_API_KEY missing, stats will be zero");
    }

    return NextResponse.json(
      {
        farcasterData,
        stats,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("BasePrint API fatal error:", err);
    return NextResponse.json(
      { error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
