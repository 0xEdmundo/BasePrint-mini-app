import { NextRequest, NextResponse } from 'next/server';
import { getEtherscanData } from '../../lib/api-helpers';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const data = await getEtherscanData(address);

    if (!data) {
        return NextResponse.json({
            txCount: 0,
            daysActive: 0,
            longestStreak: 0,
            bridge: 0,
            defi: 0,
            deployed: 0,
            walletAge: 0,
        });
    }

    return NextResponse.json(data);
}
