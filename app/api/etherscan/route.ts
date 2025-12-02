import { NextRequest, NextResponse } from 'next/server';
import { getEtherscanData } from '../../lib/api-helpers';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const data = await getEtherscanData(address);
    return NextResponse.json(data);
}
