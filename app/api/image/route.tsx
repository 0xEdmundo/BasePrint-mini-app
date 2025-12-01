import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Extract params
        const username = searchParams.get('username') || 'Explorer';
        const pfp = searchParams.get('pfp') || 'https://zora.co/assets/icon.png';
        const fid = searchParams.get('fid') || '0';
        const score = parseFloat(searchParams.get('score') || '0.5');
        const isVerified = searchParams.get('isVerified') === 'true';
        const basename = searchParams.get('basename');

        const txCount = searchParams.get('txCount') || '0';
        const daysActive = searchParams.get('daysActive') || '0';
        const walletAge = searchParams.get('walletAge') || '0';
        const bridge = searchParams.get('bridge') || '0';
        const defi = searchParams.get('defi') || '0';
        const deployed = searchParams.get('deployed') || '0';
        const streak = searchParams.get('streak') || '0';

        // Base Blue Colors
        const BLUE_PRIMARY = '#0052FF';

        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f1f5f9', // slate-100
                        fontFamily: '"Inter", sans-serif',
                    }}
                >
                    {/* Card Container */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '1000px', // Scaled up for high res
                            height: '600px',
                            backgroundColor: 'white',
                            borderRadius: '40px',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            position: 'relative',
                        }}
                    >
                        {/* 1. TOP SECTION: Profile & Gradient */}
                        <div
                            style={{
                                display: 'flex',
                                width: '100%',
                                height: '320px',
                                position: 'relative',
                                background: 'linear-gradient(135deg, #0052FF 0%, #0042cc 50%, #002980 100%)',
                                padding: '40px',
                                color: 'white',
                                justifyContent: 'space-between',
                            }}
                        >
                            {/* Profile Content */}
                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'space-between', zIndex: 10 }}>

                                {/* Header Row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {/* Logo Circle */}
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#0052FF' }}></div>
                                        </div>
                                        <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.05em' }}>BasePrint</span>
                                    </div>

                                    {isVerified && (
                                        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', backgroundColor: 'rgba(59, 130, 246, 0.9)', borderRadius: '999px', border: '1px solid #60A5FA' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verified</span>
                                        </div>
                                    )}
                                </div>

                                {/* Profile Info Row */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '30px', marginTop: '20px' }}>
                                    {/* PFP */}
                                    <img
                                        src={pfp}
                                        width="120"
                                        height="120"
                                        style={{ borderRadius: '50%', border: '4px solid white', objectFit: 'cover' }}
                                    />

                                    {/* Text Details */}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '16px', color: '#BFDBFE', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                                            FID: {fid}
                                        </span>
                                        <span style={{ fontSize: '48px', fontWeight: 900, lineHeight: 1, marginBottom: '4px' }}>
                                            {username}
                                        </span>
                                        <span style={{ fontSize: '20px', color: '#BFDBFE' }}>
                                            @{username}
                                        </span>
                                        {basename && (
                                            <div style={{ marginTop: '12px', display: 'flex' }}>
                                                <span style={{ backgroundColor: 'white', color: '#0052FF', padding: '4px 12px', borderRadius: '999px', fontSize: '16px', fontWeight: 700 }}>
                                                    {basename}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Score Bar */}
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '14px', color: '#BFDBFE', fontWeight: 700, textTransform: 'uppercase' }}>Neynar Score</span>
                                        <span style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1 }}>{parseFloat(score.toString()).toFixed(2)}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                                        <div style={{ width: `${score * 100}%`, height: '100%', background: 'linear-gradient(to right, #86efac, #22c55e)' }}></div>
                                    </div>
                                </div>

                            </div>

                            {/* Decorative Background Elements */}
                            <div style={{ position: 'absolute', right: '-40px', top: '-40px', width: '300px', height: '300px', backgroundColor: '#22d3ee', opacity: 0.1, borderRadius: '50%', filter: 'blur(60px)' }}></div>
                        </div>

                        {/* 2. BOTTOM SECTION: Stats Grid */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', width: '100%', height: '280px', backgroundColor: 'white' }}>

                            {/* Row 1 */}
                            <div style={{ display: 'flex', width: '100%', height: '50%', borderBottom: '1px solid #f3f4f6' }}>
                                {/* Active Days */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%', borderRight: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: '48px', fontWeight: 900, color: '#1e293b' }}>{daysActive}</span>
                                    <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Days</span>
                                </div>
                                {/* Wallet Age */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%' }}>
                                    <span style={{ fontSize: '48px', fontWeight: 900, color: '#1e293b' }}>{walletAge}</span>
                                    <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wallet Age (Days)</span>
                                </div>
                            </div>

                            {/* Row 2 */}
                            <div style={{ display: 'flex', width: '100%', height: '50%' }}>
                                {/* Total TXs */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '25%', borderRight: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b' }}>{txCount}</span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total TXs</span>
                                </div>
                                {/* Bridge */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '25%', borderRight: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b' }}>{bridge}</span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Bridge</span>
                                </div>
                                {/* DeFi */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '25%', borderRight: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b' }}>{defi}</span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>DeFi</span>
                                </div>
                                {/* Streak */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '25%', backgroundColor: '#eff6ff' }}>
                                    <span style={{ fontSize: '32px', fontWeight: 900, color: '#0052FF' }}>{streak}</span>
                                    <span style={{ fontSize: '12px', color: '#0052FF', fontWeight: 700, textTransform: 'uppercase' }}>Best Streak</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 800, // Slightly larger canvas to fit the card nicely
            },
        );
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
