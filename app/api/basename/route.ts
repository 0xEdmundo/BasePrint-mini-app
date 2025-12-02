import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    try {
        // Fetch basename from Base's L2 resolver
        const url = `https://resolver-api.basename.app/v1/basenames/${address}`;

        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
            },
        });

        if (!response.ok) {
            return NextResponse.json({ basename: null });
        }

        const data = await response.json();

        // Check if basename exists
        if (data && data.name) {
            return NextResponse.json({ basename: data.name });
        }

        return NextResponse.json({ basename: null });

    } catch (error: any) {
        console.error('Basename API Error:', error);
        return NextResponse.json({ basename: null });
    }
}
