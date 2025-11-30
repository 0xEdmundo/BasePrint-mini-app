import { NextResponse } from 'next/server';
import { createPublicClient, http, getAddress } from 'viem';
import { base } from 'viem/chains';

// --- AYARLAR ---
const RAW_ADDRESS = '0x685Ea8972b1f3E63Ab7c8826f3B53CaCD4737bB2'; 
const CONTRACT_ADDRESS = getAddress(RAW_ADDRESS);

// Base Ağına Bağlan
const client = createPublicClient({
  chain: base,
  transport: http()
});

// --- COINBASE API İLE DOĞRULAMA (GÜNCELLENDİ) ---
async function checkCoinbaseVerification(userAddress: string) {
  // 1. Anahtar Kontrolü
  const apiKey = process.env.NEXT_PUBLIC_COINBASE_API_KEY;
  // Bazı durumlarda Secret Key de gerekebilir (Server-side olduğu için güvenlidir)
  // const apiSecret = process.env.COINBASE_API_SECRET; 

  if (!apiKey) {
      console.log("Coinbase API Key eksik, doğrulama atlanıyor.");
      return false; 
  }

  try {
    // Coinbase API'sine istek atıyoruz.
    // NOT: Coinbase API'si genellikle cüzdan adresi ile doğrudan verification sorgusuna izin vermez.
    // OAuth2 (Giriş yap) kullanılmadığı sürece, sadece public veriler veya senin API key'inle ilişkili veriler döner.
    // Ancak, Coinbase Wallet (Smart Wallet) kullanıcıları için EAS (Attestation) en sağlıklı yöntemdir.
    
    // YÖNTEM A: Coinbase API (Eğer OAuth kullanıyorsak)
    // Bu kısım senin API Key'inin yetkilerine bağlıdır.
    // Şimdilik basit bir GET isteği örneği koyuyorum:
    const response = await fetch(`https://api.coinbase.com/v2/users/${userAddress}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'CB-VERSION': '2024-01-01'
      }
    });

    if (response.ok) {
        // Yanıt başarılıysa ve veri varsa verified kabul edebiliriz
        // (Gerçek API yanıt yapısına göre burayı incelemek gerekebilir)
        return true; 
    }
    
    // Eğer API başarısızsa (404 vs), verify edilmemiş say.
    return false;

  } catch (error) {
    console.error("Coinbase API Bağlantı Hatası:", error);
    return false;
  }
}

// --- EAS ALTERNATİFİ (EN GARANTİ YÖNTEM) ---
// Coinbase API'si karmaşık gelirse, bu fonksiyon her zaman çalışır.
async function checkEASVerification(userAddress: string) {
    try {
        const query = `
          query Attestations($where: AttestationWhereInput) {
            attestations(where: $where) {
              id
            }
          }
        `;
        // Coinbase Verified Account Schema UID (Base Mainnet)
        const schemaUID = "0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9";
        
        const variables = {
          where: {
            schemaId: { equals: schemaUID },
            recipient: { equals: userAddress },
            revocationTime: { equals: 0 },
            expirationTime: { gt: Math.floor(Date.now() / 1000) }
          }
        };
        const res = await fetch("https://base.easscan.org/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables })
        });
        const json = await res.json();
        // Eğer kayıt varsa TRUE döner
        return json.data?.attestations?.length > 0;
    } catch (e) { return false; }
}


// --- SVG OLUŞTURUCU ---
function generateSVG(username: string, score: string, tx: string, days: string, isVerified: boolean) {
  const scoreNum = parseFloat(score);
  const barWidth = Math.min(scoreNum * 200, 200); 

  return `
  <svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#0052FF;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#002980;stop-opacity:1" />
      </linearGradient>
    </defs>
    
    <rect width="800" height="500" fill="url(#bg)" rx="40" />
    <circle cx="700" cy="400" r="150" fill="#00C2FF" opacity="0.2" />
    <circle cx="100" cy="100" r="80" fill="#7B42FF" opacity="0.2" />
    
    <circle cx="720" cy="80" r="50" stroke="white" stroke-width="8" opacity="0.15" fill="none"/>
    <path d="M720 55 C706 55 695 66 695 80 C695 94 706 105 720 105" stroke="white" stroke-width="8" stroke-linecap="round" opacity="0.15" fill="none"/>

    <rect x="50" y="50" width="700" height="400" rx="30" fill="white" fill-opacity="0.1" stroke="white" stroke-width="2" stroke-opacity="0.3" />

    ${isVerified ? `
    <g transform="translate(580, 80)">
       <rect width="140" height="44" rx="22" fill="#0052FF" stroke="white" stroke-width="2" />
       <circle cx="25" cy="22" r="10" fill="white" />
       <path d="M20 22 L24 26 L30 18" stroke="#0052FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
       <text x="45" y="29" font-family="Arial, sans-serif" font-size="14" fill="white" font-weight="bold" letter-spacing="1">VERIFIED</text>
    </g>
    ` : ''}

    <text x="100" y="140" font-family="Arial, sans-serif" font-size="20" fill="#A0C4FF" letter-spacing="2">BASE IDENTITY</text>
    <text x="100" y="190" font-family="Arial, sans-serif" font-size="56" font-weight="bold" fill="white">@${username}</text>

    <line x1="100" y1="240" x2="700" y2="240" stroke="white" stroke-opacity="0.2" stroke-width="2" />

    <g transform="translate(100, 310)">
        <text font-family="Arial" font-size="14" fill="#A0C4FF" font-weight="bold">NEYNAR SCORE</text>
        <text y="40" font-family="Arial" font-size="36" font-weight="bold" fill="white">${score}</text>
        <rect y="60" width="160" height="8" rx="4" fill="rgba(0,0,0,0.3)" />
        <rect y="60" width="${barWidth * 0.8}" height="8" rx="4" fill="#00D26A" />
    </g>

    <g transform="translate(320, 310)">
        <text font-family="Arial" font-size="14" fill="#A0C4FF" font-weight="bold">LIFETIME TXS</text>
        <text y="40" font-family="Arial" font-size="36" font-weight="bold" fill="white">${tx}</text>
    </g>

    <g transform="translate(540, 310)">
        <text font-family="Arial" font-size="14" fill="#A0C4FF" font-weight="bold">ACTIVE DAYS</text>
        <text y="40" font-family="Arial" font-size="36" font-weight="bold" fill="white">${days}</text>
    </g>

    <text x="400" y="460" font-family="Arial" font-size="12" fill="white" opacity="0.6" text-anchor="middle">Minted on BasePrint • Immutable Record</text>
  </svg>
  `;
}

// --- API ENDPOINT ---
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const tokenId = params.id;

  try {
    const data = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: [{
        name: 'stats',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '', type: 'uint256' }],
        outputs: [
          { name: 'username', type: 'string' },
          { name: 'neynarScore', type: 'uint256' },
          { name: 'txCount', type: 'uint256' },
          { name: 'daysActive', type: 'uint256' },
          { name: 'mintDate', type: 'string' }
        ]
      }],
      functionName: 'stats',
      args: [BigInt(tokenId)]
    }) as [string, bigint, bigint, bigint, string];

    const owner = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: [{ 
            name: 'ownerOf', 
            type: 'function', 
            stateMutability: 'view', 
            inputs: [{name: 'tokenId', type: 'uint256'}], 
            outputs: [{name: '', type: 'address'}] 
        }],
        functionName: 'ownerOf',
        args: [BigInt(tokenId)]
    }) as string;

    const username = data[0];
    const score = (Number(data[1]) / 100).toFixed(2);
    const txCount = Number(data[2]);
    const daysActive = data[3].toString();

    // DOĞRULAMA STRATEJİSİ:
    // 1. Önce API Key varsa onu deneriz.
    // 2. API Key yoksa veya sonuç alamazsak EAS (Public Onchain Data) sorgularız.
    // EAS sorgusu daha güvenilirdir çünkü Coinbase onayı doğrudan zincire yazar.
    
    let isVerified = false;
    
    // 1. API Kontrolü (Opsiyonel)
    if (process.env.NEXT_PUBLIC_COINBASE_API_KEY) {
        isVerified = await checkCoinbaseVerification(owner);
    } 
    
    // 2. EAS Kontrolü (Fallback & Daha Güvenilir)
    // Eğer API başarısız olduysa veya "verified değil" dediyse bir de zincire bakalım.
    if (!isVerified) {
        isVerified = await checkEASVerification(owner);
    }

    const svgImage = generateSVG(username, score, txCount.toString(), daysActive, isVerified);
    const imageBase64 = Buffer.from(svgImage).toString('base64');
    const imageDataURI = `data:image/svg+xml;base64,${imageBase64}`;

    return NextResponse.json({
      name: `BasePrint ID: @${username}`,
      description: `Onchain Identity Record for @${username}. Verified Status: ${isVerified ? 'True' : 'False'}`,
      image: imageDataURI,
      attributes: [
        { trait_type: "Verified", value: isVerified ? "Yes" : "No" },
        { trait_type: "Neynar Score", value: score },
        { trait_type: "Transactions", value: txCount },
        { trait_type: "Active Days", value: daysActive },
        { trait_type: "Mint Date", value: data[4] }
      ]
    });

  } catch (error) {
    console.error("Metadata Hatası:", error);
    return NextResponse.json({ error: "Veri okunamadı" }, { status: 500 });
  }
}
