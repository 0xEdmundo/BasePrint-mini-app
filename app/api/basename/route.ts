import { NextRequest, NextResponse } from 'next/server';
import { getBasenameData } from '../../lib/api-helpers';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const data = await getBasenameData(address);

    if (!data) {
        return NextResponse.json({ basename: null });
    }

    return NextResponse.json(data);
}
