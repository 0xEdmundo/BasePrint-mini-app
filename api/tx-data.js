import { encodeFunctionData, parseEther, getAddress } from 'viem'; 
// Bu fonksiyonlar, Next.js ortamında viem kütüphanesinden içe aktarılır.

// >>> NFT PROJESİNE AİT SABİTLER <<<
// BaseScan'de doğrulanmış kontrat adresi (Base Mainnet):
const BASE_NFT_CONTRACT_ADDRESS = getAddress("0x685Ea8972b1f3E63Ab7c8826f3B53CaCD4737bB2"); 
const MINT_COST_ETH = "0.000777"; // Kontratın halka açık mint fiyatı
const MINT_FUNCTION_NAME = "mint";

// Kontratın argüman almayan (varsayılan 1 NFT basan) ve ETH kabul eden mint() fonksiyonunun ABI parçası.
// Eğer kontratınız farklı bir mint fonksiyonu kullanıyorsa (örneğin miktar alan), bu ABI'yı değiştirmeniz gerekir.
const MINT_FUNCTION_ABI = [{
    "inputs": [],
    "name": MINT_FUNCTION_NAME,
    "outputs": [],
    "stateMutability": "payable", // ETH transferi olduğu için payable olmalı
    "type": "function"
}];

// Farcaster Frame'in Mint işlemi için ana API Route Handler'ı.
export default async function handler(req, res) {
    // Sadece POST isteklerine izin verilir.
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // 1. Farcaster'dan gelen Frame POST verisini oku
        const frameData = req.body;
        
        // 2. İşlemi imzalayacak olan kullanıcının cüzdan adresini al. 
        // Bu adres, NFT'nin gönderileceği adrestir.
        const signerAddress = frameData.untrustedData.address;
        
        if (!signerAddress) {
            throw new Error("Farcaster signer (user) address is missing in frame data.");
        }

        // 3. Kontrat fonksiyonu çağrısı için kodlanmış veriyi (data) oluştur.
        // Argüman almayan mint() fonksiyonu için:
        const encodedData = encodeFunctionData({
            abi: MINT_FUNCTION_ABI, 
            functionName: MINT_FUNCTION_NAME,
            args: [] 
        });

        // 4. İşlem (Transaction) JSON verisini oluştur.
        const txData = {
            // Base Mainnet zincir ID'si
            chainId: "eip155:8453", 
            // Cüzdana gönderilecek işlem metodu
            method: "eth_sendTransaction",
            params: {
                abi: MINT_FUNCTION_ABI, // İşlem detaylarını cüzdana gösterir
                to: BASE_NFT_CONTRACT_ADDRESS, // Hedef kontrat adresi
                data: encodedData, // Hangi fonksiyonun çağrılacağı bilgisi (mint())
                // Mint maliyetini (0.000777 ETH) WEI birimine çevirir.
                value: parseEther(MINT_COST_ETH).toString(10), 
            }
        };

        // 5. Hazırlanan JSON verisini Warpcast'e (Frame'e) yanıt olarak gönder.
        // Warpcast bu veriyi kullanarak kullanıcının cüzdanını açar ve işlemi onaylamasını ister.
        res.status(200).json(txData);

    } catch (error) {
        console.error("TX Data Generation Error:", error);
        // Hata durumunda, Warpcast'e anlaşılır bir hata mesajı döndür.
        res.status(500).json({ error: "Failed to generate transaction data. Please check the contract setup. Error: " + error.message });
    }
}
