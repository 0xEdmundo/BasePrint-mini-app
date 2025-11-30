import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { address } = req.query;

    if (!address) {
        return res.status(400).json({ error: 'Missing address parameter' });
    }

    // Use environment variable for API key (server-side)
    // Support both NEXT_PUBLIC_ prefixed (if that's what user has) and standard
    const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

    if (!apiKey) {
        console.error('Neynar API key missing');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`;

        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'x-api-key': apiKey
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Neynar API error: ${response.status} ${errorText}`);
            throw new Error(`Neynar API returned ${response.status}`);
        }

        const data = await response.json();

        // Neynar response handling
        // It might be { [address]: [user] } or { users: [user] } depending on exact endpoint version/behavior
        // We try to find the user object safely
        let user = null;
        const lowerAddr = address.toLowerCase();

        if (data[lowerAddr] && Array.isArray(data[lowerAddr])) {
            user = data[lowerAddr][0];
        } else if (data.users && Array.isArray(data.users)) {
            user = data.users[0];
        } else if (Array.isArray(data)) {
            user = data[0];
        }

        // Fallback: check keys if they match the address case-insensitively
        if (!user) {
            const key = Object.keys(data).find(k => k.toLowerCase() === lowerAddr);
            if (key && Array.isArray(data[key])) {
                user = data[key][0];
            }
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found on Farcaster' });
        }

        // Standardize the response
        const formattedUser = {
            username: user.username,
            pfp: user.pfp_url,
            fid: user.fid,
            score: user.score ?? user.experimental?.neynar_user_score ?? 0.5,
            isVerified: user.power_badge ?? false,
            since: user.created_at ? new Date(user.created_at).getFullYear().toString() : '2024'
        };

        return res.status(200).json(formattedUser);

    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ error: 'Failed to fetch Farcaster data' });
    }
}
