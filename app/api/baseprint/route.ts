import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Known Base bridge contract addresses
const BRIDGE_ADDRESSES = [
  "0x49048044d57e1c92a77f79988d21fa8faf74e97e", // Base Official Bridge
  "0x3154cf16ccdb4c6d922629664174b904d80f2c35", // Coinbase Bridge
  "0x4200000000000000000000000000000000000010", // L2 Standard Bridge
  "0x4200000000000000000000000000000000000016", // L2 To L1 Message Passer
].map(addr => addr.toLowerCase());

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

type AlchemyTransfer = {
  hash: string;
  from: string;
  to: string | null;
  category: string;
  metadata?: {
    blockTimestamp?: string;
  };
  [key: string]: any;
};

// Alchemy API call helper
async function alchemyRequest(method: string, params: any[]) {
  const response = await fetch(ALCHEMY_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
  return response.json();
}

function computeBaseStats(transfers: AlchemyTransfer[]) {
  if (!Array.isArray(transfers) || transfers.length === 0) {
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
  let bridge = 0;
  let defi = 0;

  for (const tx of transfers) {
    // Extract timestamp
    const timestamp = tx.metadata?.blockTimestamp;
    if (timestamp) {
      const tsMs = new Date(timestamp).getTime();
      if (!Number.isNaN(tsMs) && tsMs > 0) {
        const dayStr = new Date(tsMs).toISOString().slice(0, 10);
        daysSet.add(dayStr);
        if (firstTs === null || tsMs < firstTs) firstTs = tsMs;
      }
    }

    // Contract deployment (to is null)
    if (!tx.to || tx.to === "") {
      deployed++;
    }

    // Bridge detection via known addresses
    const toAddress = tx.to?.toLowerCase() || "";
    const fromAddress = tx.from?.toLowerCase() || "";

    if (BRIDGE_ADDRESSES.includes(toAddress) || BRIDGE_ADDRESSES.includes(fromAddress)) {
      bridge++;
    }

    // DeFi detection: ERC-20 and ERC-721 transfers indicate DeFi/NFT activity
    if (tx.category === "erc20" || tx.category === "erc721") {
      defi++;
    }
  }

  // Calculate longest streak
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
      ? Math.max(1, Math.round((now - firstTs) / (24 * 60 * 60 * 1000)))
      : 0;

  return {
    txCount: transfers.length,
    daysActive: daysSet.size,
    walletAge,
    bridge,
    defi,
    deployed,
    longestStreak,
  };
}

async function fetchBaseStats(address: string) {
  if (!ALCHEMY_API_KEY) {
    throw new Error("ALCHEMY_API_KEY is not configured");
  }

  try {
    // Get all transfers FROM this address
    const fromTransfersRes = await alchemyRequest("alchemy_getAssetTransfers", [
      {
        fromAddress: address,
        category: ["external", "erc20", "erc721", "erc1155", "internal"],
        withMetadata: true,
        order: "asc",
        maxCount: "0x3e8", // 1000 transfers max
      },
    ]);

    // Get all transfers TO this address
    const toTransfersRes = await alchemyRequest("alchemy_getAssetTransfers", [
      {
        toAddress: address,
        category: ["external", "erc20", "erc721", "erc1155", "internal"],
        withMetadata: true,
        order: "asc",
        maxCount: "0x3e8", // 1000 transfers max
      },
    ]);

    // Combine all transfers
    const fromTransfers: AlchemyTransfer[] = fromTransfersRes.result?.transfers || [];
    const toTransfers: AlchemyTransfer[] = toTransfersRes.result?.transfers || [];
    const allTransfers = [...fromTransfers, ...toTransfers];

    // Sort by block timestamp
    allTransfers.sort((a, b) => {
      const tsA = a.metadata?.blockTimestamp ? new Date(a.metadata.blockTimestamp).getTime() : 0;
      const tsB = b.metadata?.blockTimestamp ? new Date(b.metadata.blockTimestamp).getTime() : 0;
      return tsA - tsB;
    });

    // Remove duplicates by hash
    const uniqueTransfers = allTransfers.filter(
      (tx, index, self) => index === self.findIndex((t) => t.hash === tx.hash)
    );

    return computeBaseStats(uniqueTransfers);
  } catch (err) {
    console.error("Alchemy API error:", err);
    return computeBaseStats([]);
  }
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
