import { NextResponse } from "next/server";

// Vercel'de tanımlı env değişkenleri (şu an sende böyle)
const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;

// -----------------------------
// Helpers
// -----------------------------

// Günlük aktiflik streak hesabı
function calculateStreak(dateStrings: string[]): number {
  if (!dateStrings.length) return 0;

  const dates = dateStrings
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i++) {
    const diffDays =
      (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current++;
    } else {
      if (current > longest) longest = current;
      current = 1;
    }
  }

  if (current > longest) longest = current;
  return longest;
}

// Cüzdan yaşını gün cinsinden hesapla
function calculateWalletAgeDays(firstTxTimestamp: number): number {
  if (!firstTxTimestamp) return 0;
  const first = new Date(firstTxTimestamp * 1000);
  const now = new Date();
  return Math.floor((now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
}

// Bridge / DeFi / Deployed kontrat analizi
function analyzeTransactions(txs: any[]) {
  let bridge = 0;
  let deployed = 0;
  let interactions = 0;

  for (const tx of txs) {
    // Kontrat deploy: "to" boş
    if (!tx.to || tx.to === "") {
      deployed++;
      continue;
    }

    // methodId varsa kullan, yoksa input'tan çıkar
    const method =
      tx.methodId ||
      (tx.input && tx.input.length >= 10 ? tx.input.substring(0, 10) : null);

    if (method && method !== "0x") {
      interactions++;

      // Bilinen bridge methodId listesi (L1<->Base köprüleri)
      if (
        [
          "0x32b7006d",
          "0x49228978",
          "0x5cae9c06",
          "0x9a2ac9d9", // örnek: resmi bridge kontratlarının method id'leri
        ].includes(method)
      ) {
        bridge++;
      }
    }
  }

  // Lend/Borrow/Stake sayısı (heuristic)
  const defi = Math.max(0, Math.floor((interactions - bridge) * 0.4));

  return { bridge, defi, deployed };
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

    if (!NEYNAR_API_KEY || !ETHERSCAN_API_KEY) {
      return NextResponse.json(
        { error: "Server config error: missing NEYNAR_API_KEY or ETHERSCAN_API_KEY" },
        { status: 500 }
      );
    }

    // ----------------------------------
    // 1) NEYNAR: wallet -> Farcaster profile
    // ----------------------------------
    const neynarRes = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: {
          "api-key": NEYNAR_API_KEY,
          accept: "application/json",
        },
        cache: "no-store",
      }
    );

    if (!neynarRes.ok) {
      const txt = await neynarRes.text();
      console.error("Neynar error body:", txt);
      return NextResponse.json(
        { error: "Neynar request failed", details: txt },
        { status: 502 }
      );
    }

    const neynarJson: any = await neynarRes.json();

    const list = neynarJson?.users?.[address];

    if (!Array.isArray(list) || list.length === 0) {
      // Wallet Farcaster’a bağlı değil => fallback yok, direkt hata
      return NextResponse.json(
        { error: "No Farcaster profile found for this address" },
        { status: 404 }
      );
    }

    const u = list[0];

    // pfp alanı bazı versiyonlarda u.pfp.url, bazısında u.pfp_url
    const pfp =
      (u.pfp && (u.pfp.url || u.pfp.picture_url)) ||
      u.pfp_url ||
      "";

    // score alanı versiyona göre değişebiliyor, hepsini sırayla deniyoruz
    const rawScore =
      typeof u.score === "number"
        ? u.score
        : typeof u.neynar_user_score === "number"
        ? u.neynar_user_score
        : typeof u.farcaster_score === "number"
        ? u.farcaster_score
        : 0;

    const farcasterData = {
      fid: u.fid,
      username: u.username,
      pfp,
      score: rawScore,
    };

    // ----------------------------------
    // 2) ETHERSCAN (chainid=8453, Base)
    // ----------------------------------

    // Tüm TX listesi
    const txUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;

    const txRes = await fetch(txUrl, { cache: "no-store" });
    const txJson: any = await txRes.json();

    // Default stats
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
            new Date(parseInt(tx.timeStamp, 10) * 1000).toDateString()
          )
        )
      ) as string[];

      const analysis = analyzeTransactions(txs);

      const firstTxTs = parseInt(txs[0].timeStamp || "0", 10);
      const walletAge = calculateWalletAgeDays(firstTxTs);

      // Balance
      const balUrl = `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
      const balRes = await fetch(balUrl, { cache: "no-store" });
      const balJson: any = await balRes.json();

      const balanceRaw = BigInt(balJson.result || "0");
      const hasBalance = balanceRaw > BigInt(0);

      const isVerified = txs.length > 5 && hasBalance;

      stats = {
        txCount: txs.length,                 // TOTAL TXs
        daysActive: uniqueDates.length,      // ACTIVE DAYS
        longestStreak: calculateStreak(uniqueDates), // BEST STREAK
        bridge: analysis.bridge,             // BRIDGE TXs (L1<->Base)
        defi: analysis.defi,                 // Lend/Borrow/Stake (DeFi)
        deployed: analysis.deployed,         // SMART CONTRACTS
        walletAge,                           // WALLET AGE (days)
        isVerified,                          // "verified" mantığı
      };
    }

    // ----------------------------------
    // 3) RESPONSE
    // ----------------------------------
    return NextResponse.json({
      farcasterData,
      stats,
    });
  } catch (err: any) {
    console.error("BasePrint /api/baseprint error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
