// Next.js API Route Handler for Dynamic Frame Images
// Bu dosya, Frame'in görselini oluşturur. 
// Basit bir örnek için, görsel yerine Base renklerinde bir SVG döndüreceğiz.

export default async function handler(req, res) {
    // URL sorgu parametresinden metni al
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const text = searchParams.get('text') || 'BasePrint Frame';

    // Base Mavi rengi
    const BASE_BLUE = '#24375A'; 
    const LIGHT_GRAY = '#F3F4F6';

    // Content-Type'ı SVG olarak ayarla
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'max-age=10, public, must-revalidate');

    // Dinamik SVG oluşturma (Görsel yerine geçer)
    const svg = `
        <svg width="600" height="400" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
            <rect width="600" height="400" fill="${LIGHT_GRAY}"/>
            <rect x="20" y="20" width="560" height="360" fill="${BASE_BLUE}" rx="15"/>
            <text x="300" y="200" font-family="Arial, sans-serif" font-size="36" fill="white" text-anchor="middle" dominant-baseline="middle">
                ${text}
            </text>
            <text x="300" y="245" font-family="Arial, sans-serif" font-size="20" fill="#60A5FA" text-anchor="middle" dominant-baseline="middle">
                Farcaster Mini App on Base
            </text>
            <rect x="530" y="330" width="50" height="50" fill="#0052FF" rx="10"/>
        </svg>
    `;

    res.status(200).send(svg);
}
