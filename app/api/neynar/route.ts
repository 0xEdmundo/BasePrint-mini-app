import { NextRequest, NextResponse } from 'next/server';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (!NEYNAR_API_KEY) {
        return NextResponse.json({ error: 'Neynar API key not configured' }, { status: 500 });
    }

    try {
        // Fetch user data from Neynar V2 API
        const url = `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`;

        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'api_key': NEYNAR_API_KEY,
            },
        });

        if (!response.ok) {
            console.error('Neynar API error:', response.status, response.statusText);
            return NextResponse.json({
                username: 'Explorer',
                pfp: '',
                score: 0.5,
                fid: 0,
                since: '2024',
                isVerified: false,
            });
        }

        const data = await response.json();

        // Check if user exists
        if (!data || !data[address.toLowerCase()] || data[address.toLowerCase()].length === 0) {
            return NextResponse.json({
                username: 'Explorer',
                pfp: '',
                score: 0.5,
                fid: 0,
                since: '2024',
                isVerified: false,
            });
        }

        const user = data[address.toLowerCase()][0];

        // Calculate a simple score based on follower count and engagement
        const followerCount = user.follower_count || 0;
        const followingCount = user.following_count || 0;

        // Simple scoring algorithm (0-1 scale)
        let score = 0.5; // Base score

        if (followerCount > 0) {
            score += Math.min(followerCount / 1000, 0.3); // Up to 0.3 for followers
        }

        if (followingCount > 0) {
            score += Math.min(followingCount / 500, 0.1); // Up to 0.1 for following
        }

        if (user.power_badge) {
            score += 0.1; // Bonus for power badge
        }

        score = Math.min(score, 1.0); // Cap at 1.0

        return NextResponse.json({
            username: user.username || 'Explorer',
            pfp: user.pfp_url || '',
            score: parseFloat(score.toFixed(2)),
            fid: user.fid || 0,
            since: user.profile?.bio?.registered_at ? new Date(user.profile.bio.registered_at).getFullYear().toString() : '2024',
            isVerified: user.power_badge || false,
        });

    } catch (error: any) {
        console.error('Neynar API Error:', error);
        return NextResponse.json({
            username: 'Explorer',
            pfp: '',
            score: 0.5,
            fid: 0,
            since: '2024',
            isVerified: false,
        });
    }
}
