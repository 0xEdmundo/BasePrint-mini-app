import { NextRequest, NextResponse } from 'next/server';
import { getNeynarData } from '../../lib/api-helpers';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const data = await getNeynarData(address);

    if (!data) {
        return NextResponse.json({
            username: 'Explorer',
            pfp: '',
            score: 0.5,
            fid: 0,
            since: '2024',
            isVerified: false,
        });
    }

    return NextResponse.json(data);
}
