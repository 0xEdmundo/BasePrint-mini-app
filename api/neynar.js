import fetch from 'node-fetch';

/**
 * GET /api/neynar?fid=12345
 * Returns Farcaster user profile data from Neynar.
 */
export default async function handler(req, res) {
    const { fid } = req.query;
    if (!fid) {
        return res.status(400).json({ error: 'Missing fid query parameter' });
    }
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Neynar API key not configured' });
    }
    const url = `https://api.neynar.com/v2/farcaster/user/bulk?fid=${encodeURIComponent(fid)}`;
    try {
        const response = await fetch(url, {
            headers: {
                'api_key': apiKey,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Neynar request failed: ${response.status} ${txt}`);
        }
        const data = await response.json();
        const user = data?.users?.[0] ?? null;
        return res.status(200).json({ success: true, user });
    } catch (err) {
        console.error('Neynar fetch error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
