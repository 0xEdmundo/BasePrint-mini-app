import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Extract params
        const username = searchParams.get('username') || 'Explorer';
        const displayName = searchParams.get('displayName') || username;
        const pfp = searchParams.get('pfp') || 'https://zora.co/assets/icon.png';
        const fid = searchParams.get('fid') || '0';
        const score = parseFloat(searchParams.get('score') || '0.5');
        const isVerified = searchParams.get('isVerified') === 'true';
        const basename = searchParams.get('basename');

        const txCount = searchParams.get('txCount') || '0';
        const daysActive = searchParams.get('daysActive') || '0';
        const walletAge = searchParams.get('walletAge') || '0';

        // Bridge - separated by direction
        const bridgeToEth = searchParams.get('bridgeToEth') || '0';
        const bridgeFromEth = searchParams.get('bridgeFromEth') || '0';

        // DeFi - categorized
        const defiLend = searchParams.get('defiLend') || '0';
        const defiBorrow = searchParams.get('defiBorrow') || '0';
        const defiSwap = searchParams.get('defiSwap') || '0';
        const defiStake = searchParams.get('defiStake') || '0';

        const deployed = searchParams.get('deployed') || '0';
        const longestStreak = searchParams.get('longestStreak') || '0';
        const currentStreak = searchParams.get('currentStreak') || '0';
        const mintDate = searchParams.get('date') || '';

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
                        backgroundColor: '#f1f5f9',
                        fontFamily: '"Inter", sans-serif',
                    }}
                >
                    {/* Card Container - Resized for 1200x630 canvas */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '900px',
                            height: '540px',
                            backgroundColor: 'white',
                            borderRadius: '36px',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            position: 'relative',
                        }}
                    >
                        {/* 1. TOP SECTION: Profile & Gradient */}
                        <div style={{ display: 'flex', width: '100%', height: '250px', position: 'relative', background: 'linear-gradient(135deg, #0052FF 0%, #0042cc 50%, #002980 100%)', padding: '28px', color: 'white', justifyContent: 'space-between' }}>
                            {/* Profile Content */}
                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'space-between', zIndex: 10 }}>
                                {/* Header Row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    {/* Logo Circle */}
                                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#0052FF' }} />
                                    </div>
                                    <span style={{ fontSize: '16px', fontWeight: 600, opacity: 0.9, marginLeft: '10px' }}>BasePrint</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '14px', opacity: 0.7, fontWeight: 500 }}>FID: {fid}</span>
                                </div>

                                {/* Main Profile Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: '10px' }}>
                                    {/* Avatar */}
                                    <img
                                        src={pfp}
                                        alt={username}
                                        style={{
                                            width: '100px',
                                            height: '100px',
                                            borderRadius: '50%',
                                            border: '4px solid rgba(255, 255, 255, 0.3)',
                                            objectFit: 'cover',
                                        }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '42px', fontWeight: 800, lineHeight: '1.1', letterSpacing: '-0.02em' }}>{displayName}</span>
                                        <span style={{ fontSize: '20px', opacity: 0.8, fontWeight: 500 }}>@{username}</span>
                                    </div>
                                </div>

                                {/* Neynar Score Bar */}
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Neynar Score</span>
                                        <span style={{ fontSize: '14px', fontWeight: 700 }}>{score.toFixed(2)}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(score * 100, 100)}%`, height: '100%', backgroundColor: '#22c55e', borderRadius: '4px' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Background Element */}
                            <div style={{
                                position: 'absolute',
                                top: '0',
                                right: '0',
                                width: '500px',
                                height: '500px',
                                background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
                                borderRadius: '50%',
                                pointerEvents: 'none'
                            }} />
                        </div>

                        {/* 2. BOTTOM SECTION: Stats Grid */}
                        <div style={{ display: 'flex', flex: 1, padding: '20px', flexDirection: 'column' }}>
                            {/* Main Stats Row */}
                            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <span style={{ fontSize: '36px', fontWeight: 800, color: '#1e293b' }}>{daysActive}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Days</span>
                                </div>
                                <div style={{ width: '1px', height: '50px', backgroundColor: '#e2e8f0' }} />
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <span style={{ fontSize: '36px', fontWeight: 800, color: '#1e293b' }}>{walletAge}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wallet Age</span>
                                </div>
                                <div style={{ width: '1px', height: '50px', backgroundColor: '#e2e8f0' }} />
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <span style={{ fontSize: '36px', fontWeight: 800, color: '#1e293b' }}>{txCount}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total TXs</span>
                                </div>
                            </div>

                            {/* Secondary Stats Row */}
                            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                {/* Bridge Activity */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Bridge Activity</span>
                                    <div style={{ display: 'flex', gap: '20px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#334155' }}>{bridgeToEth}</span>
                                            <span style={{ fontSize: '9px', color: '#94a3b8' }}>Base→ETH</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ fontSize: '20px', fontWeight: 700, color: '#334155' }}>{bridgeFromEth}</span>
                                            <span style={{ fontSize: '9px', color: '#94a3b8' }}>ETH→Base</span>
                                        </div>
                                    </div>
                                </div>

                                {/* DeFi Activity */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>DeFi Activity</span>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ fontSize: '18px', fontWeight: 700, color: '#334155' }}>{defiSwap}</span>
                                            <span style={{ fontSize: '9px', color: '#94a3b8' }}>Swap</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ fontSize: '18px', fontWeight: 700, color: '#334155' }}>{defiLend}</span>
                                            <span style={{ fontSize: '9px', color: '#94a3b8' }}>Lend</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <span style={{ fontSize: '18px', fontWeight: 700, color: '#334155' }}>{defiBorrow}</span>
                                            <span style={{ fontSize: '9px', color: '#94a3b8' }}>Borrow</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer / Streak */}
                            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', marginTop: 'auto', backgroundColor: '#eff6ff', padding: '12px 20px', borderRadius: '16px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#0052FF', textTransform: 'uppercase' }}>Current Streak</span>
                                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#0052FF' }}>{currentStreak}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Best Streak</span>
                                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#334155' }}>{longestStreak}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Contracts</span>
                                    <span style={{ fontSize: '20px', fontWeight: 800, color: '#334155' }}>{deployed}</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            },
        );
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
