import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY;

type FarcasterUser = {
  fid: number;
  username: string;
  pfp_url?: string;
  pfp?: { url?: string };
  score?: number;
  experimental?: {
    neynar_user_score?: number;
  };
};

type BaseScanTx = {
  timeStamp?: string;
  contractAddress?: string;
  [key: string]: any;
};

function computeBaseStats(txs: BaseScanTx[]) {
  if (!Array.isArray(txs) || txs.length === 0) {
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

  const daysSet = new Set<string>();
  let firstTs: number | null = null;
  let deployed = 0;

  for (const tx of txs) {
    const tsMs = Number(tx.timeStamp || 0) * 1000;
    if (!Number.isNaN(tsMs) && tsMs > 0) {
      const dayStr = new Date(tsMs).toISOString().slice(0, 10);
      daysSet.add(dayStr);
      if (firstTs === null || tsMs < firstTs) firstTs = tsMs;
    }

    if (
      tx.contractAddress &&
      tx.contractAddress !== "0x0000000000000000000000000000000000000000"
    ) {
      deployed++;
    }
  }

  const sortedDays = Array.from(daysSet).sort();
  let longestStreak = 0;
  let currentStreak = 0;
  let prevDayTs: number | null = null;

  for (const day of sortedDays) {
    const ts = new Date(day + "T00:00:00Z").getTime();
    if (prevDayTs === null || ts - prevDayTs > 24 * 60 * 60 * 1000 + 1) {
      currentStreak = 1;
    } else {
      currentStreak++;
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak;
    prevDayTs = ts;
  }

  const now = Date.now();
  const walletAge =
    firstTs !== null
      ? Math.max(
          1,
          Math.round((now - firstTs) / (24 * 60 * 60 * 1000))
        )
      : 0;

  return {
    txCount: txs.length,
    daysActive: daysSet.size,
    walletAge,
    bridge: 0, // Şimdilik basit bırakıyoruz
    defi: 0, // Şimdilik basit bırakıyoruz
    deployed,
    longestStreak,
  };
}

async function fetchBaseStats(address: string) {
  if (!BASESCAN_API_KEY) {
    throw new Error("BASESCAN_API_KEY is not configured");
  }

  const url = `https://api.basescan.org/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${BASESCAN_API_KEY}`;

  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.error("BaseScan error status:", res.status);
    return computeBaseStats([]);
  }

  const json = await res.json();

  const txs: BaseScanTx[] = Array.isArray(json.result)
    ? (json.result as BaseScanTx[])
    : [];

  return computeBaseStats(txs);
}

async function fetchFarcasterUser(address: string): Promise<FarcasterUser | null> {
  if (!NEYNAR_API_KEY) {
    throw new Error("NEYNAR_API_KEY is not configured");
  }

  const lower = address.toLowerCase();

  // 1) Ana endpoint: bulk-by-address
  try {
    const bulkUrl = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(
      lower
    )}`;

    const bulkRes = await fetch(bulkUrl, {
      headers: {
        "x-api-key": NEYNAR_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 },
    });

    if (bulkRes.ok) {
      const data = (await bulkRes.json()) as Record<string, FarcasterUser[]>;
      const usersForAddress = data[lower];

      if (Array.isArray(usersForAddress) && usersForAddress.length > 0) {
        return usersForAddress[0];
      }
    } else if (bulkRes.status !== 404) {
      console.error("Neynar bulk-by-address status:", bulkRes.status);
    }
  } catch (err) {
    console.error("Neynar bulk-by-address error:", err);
  }

  // 2) Fallback: custody-address
  try {
    const custodyUrl = `https://api.neynar.com/v2/farcaster/user/custody-address?custody_address=${encodeURIComponent(
      lower
    )}`;

    const custodyRes = await fetch(custodyUrl, {
      headers: {
        "x-api-key": NEYNAR_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 },
    });

    if (custodyRes.ok) {
      const json = (await custodyRes.json()) as { user?: FarcasterUser };
      if (json.user) {
        return json.user;
      }
    } else if (custodyRes.status !== 404) {
      console.error("Neynar custody-address status:", custodyRes.status);
    }
  } catch (err) {
    console.error("Neynar custody-address error:", err);
  }

  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing address" },
      { status: 400 }
    );
  }

  try {
    const [user, stats] = await Promise.all([
      fetchFarcasterUser(address),
      fetchBaseStats(address),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: "NO_FARCASTER_PROFILE_FOR_ADDRESS" },
        { status: 404 }
      );
    }

    const score =
      (user as any).score ??
      (user as any).neynar_user_score ??
      ((user.experimental && user.experimental.neynar_user_score) || 0);

    const pfp =
      user.pfp_url ||
      (user.pfp && user.pfp.url) ||
      "https://zora.co/assets/icon.png";

    return NextResponse.json({
      farcasterData: {
        fid: user.fid,
        username: user.username,
        pfp,
        score,
      },
      stats,
    });
  } catch (err) {
    console.error("BasePrint /api/baseprint error:", err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
