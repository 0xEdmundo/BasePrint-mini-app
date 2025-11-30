import { NextResponse } from 'next/server';
import { getAddress } from 'viem';

// --- EAS ALTERNATİFİ (EN GARANTİ COINBASE DOĞRULAMASI) ---
// Coinbase API'leri cüzdan doğrulaması için genellikle OAuth2 (Giriş Yap) gerektirir.
// Ancak Coinbase, doğrulanmış cüzdanları Onchain (zincir üstü) olarak EAS'e yazar.
// Bu yöntem %100 çalışır ve SADECE PUBLIC verileri kullandığı için API Anahtarı GEREKTİRMEZ.
async function checkEASVerification(userAddress: string) {
    try {
        // Kontrol edilecek şema (Base Mainnet'teki Coinbase Verified Account şeması)
        const schemaUID = "0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9";
        
        const query = `
          query Attestations($where: AttestationWhereInput) {
            attestations(where: $where) {
              id
            }
          }
        `;
        
        const variables = {
          where: {
            schemaId: { equals: schemaUID },
            recipient: { equals: userAddress }, // Kullanıcının adresini buraya koyuyoruz
            revocationTime: { equals: 0 }, // İptal edilmemiş olmalı
            expirationTime: { gt: Math.floor(Date.now() / 1000) } // Süresi dolmamış olmalı
          }
        };

        // Base ağı EAS GraphQL endpoint'ine istek atıyoruz
        const res = await fetch("https://base.easscan.org/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables })
        });
        
        const json = await res.json();
        
        // Eğer sonuçlarda attestation (onay kaydı) varsa, cüzdan Verified demektir.
        return json.data?.attestations?.length > 0;

    } catch (e) { 
        console.error("EAS Doğrulama Hatası:", e);
        return false; 
    }
}


// --- API ENDPOINT ---
export async function GET(request: Request, { params }: { params: { address: string } }) {
  const rawAddress = params.address;
  
  try {
    // Adresin geçerli bir Ethereum adresi olduğundan emin olalım
    const userAddress = getAddress(rawAddress); 
    
    // YALNIZCA Coinbase doğrulaması yapılıyor
    const isVerified = await checkEASVerification(userAddress);

    // Sonucu JSON olarak döndür
    return NextResponse.json({
      address: userAddress,
      isCoinbaseVerified: isVerified,
      message: isVerified 
        ? "Bu cüzdan adresi Base ağı üzerinde Coinbase tarafından doğrulanmıştır." 
        : "Bu cüzdan adresi için Coinbase doğrulaması bulunamamıştır."
    });

  } catch (error) {
    console.error("API Hatası: Geçersiz Adres veya Sunucu Sorunu", error);
    return NextResponse.json(
      { error: "Geçersiz cüzdan adresi formatı." }, 
      { status: 400 }
    );
  }
}
