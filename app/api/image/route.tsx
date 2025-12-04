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

        // Using 1:1 aspect ratio (1000x1000) for mobile-first design
        // This ensures no cropping on any platform
        return new ImageResponse(
            (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: 'white',
                        fontFamily: '"Inter", sans-serif',
                    }}
                >
                    {/* TOP SECTION: Profile & Gradient */}
                    <div
                        style={{
                            display: 'flex',
                            width: '100%',
                            height: '380px',
                            position: 'relative',
                            background: 'linear-gradient(135deg, #0052FF 0%, #0042cc 50%, #002980 100%)',
                            padding: '32px',
                            color: 'white',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'space-between', zIndex: 10 }}>

                            {/* Header Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#0052FF' }}></div>
                                    </div>
                                    <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.05em' }}>BasePrint</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {isVerified && (
                                        <div style={{ display: 'flex', padding: '6px 14px', backgroundColor: 'rgba(59, 130, 246, 0.9)', borderRadius: '999px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Verified</span>
                                        </div>
                                    )}
                                    <span style={{ fontSize: '14px', color: '#BFDBFE', fontFamily: 'monospace' }}>FID: {fid}</span>
                                </div>
                            </div>

                            {/* Profile Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                <img
                                    src={pfp}
                                    width="100"
                                    height="100"
                                    style={{ borderRadius: '50%', border: '4px solid white', objectFit: 'cover' }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '42px', fontWeight: 900, lineHeight: 1.1 }}>{displayName}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '20px', color: '#BFDBFE' }}>@{username}</span>
                                        {basename && (
                                            <span style={{ backgroundColor: 'white', color: '#0052FF', padding: '4px 12px', borderRadius: '999px', fontSize: '14px', fontWeight: 700 }}>
                                                {basename}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Score Bar */}
                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#BFDBFE', fontWeight: 700, textTransform: 'uppercase' }}>Neynar Score</span>
                                    <span style={{ fontSize: '28px', fontWeight: 900, lineHeight: 1 }}>{parseFloat(score.toString()).toFixed(2)}</span>
                                </div>
                                <div style={{ width: '100%', height: '12px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                                    <div style={{ width: `${score * 100}%`, height: '100%', background: 'linear-gradient(to right, #86efac, #22c55e)' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Decorative */}
                        <div style={{ position: 'absolute', right: '-50px', top: '-50px', width: '300px', height: '300px', backgroundColor: '#22d3ee', opacity: 0.1, borderRadius: '50%', filter: 'blur(60px)' }}></div>
                    </div>

                    {/* BOTTOM SECTION: Stats - 2 Column Layout */}
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, backgroundColor: 'white' }}>

                        {/* Row 1: Main Metrics - 2x2 Grid */}
                        <div style={{ display: 'flex', width: '100%', height: '160px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%', borderRight: '1px solid #e5e7eb' }}>
                                <span style={{ fontSize: '48px', fontWeight: 900, color: '#1e293b' }}>{daysActive}</span>
                                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Active Days</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%' }}>
                                <span style={{ fontSize: '48px', fontWeight: 900, color: '#1e293b' }}>{walletAge}</span>
                                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Wallet Age</span>
                            </div>
                        </div>

                        {/* Row 2: TXs and Bridge */}
                        <div style={{ display: 'flex', width: '100%', height: '160px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%', borderRight: '1px solid #e5e7eb' }}>
                                <span style={{ fontSize: '48px', fontWeight: 900, color: '#1e293b' }}>{txCount}</span>
                                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total TXs</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%' }}>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Bridge Activity</span>
                                <div style={{ display: 'flex', gap: '32px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b' }}>{bridgeToEth}</span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Base→ETH</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b' }}>{bridgeFromEth}</span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>ETH→Base</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: DeFi and Streaks */}
                        <div style={{ display: 'flex', width: '100%', height: '160px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%', borderRight: '1px solid #e5e7eb' }}>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>DeFi Activity</span>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b' }}>{defiSwap}</span>
                                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Swap</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b' }}>{defiLend}</span>
                                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Lend</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b' }}>{defiBorrow}</span>
                                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Borrow</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b' }}>{defiStake}</span>
                                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Stake</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%', backgroundColor: '#eff6ff' }}>
                                <span style={{ fontSize: '48px', fontWeight: 900, color: '#0052FF' }}>{currentStreak}</span>
                                <span style={{ fontSize: '14px', color: '#0052FF', fontWeight: 700, textTransform: 'uppercase' }}>Current Streak</span>
                            </div>
                        </div>

                        {/* Row 4: Best Streak and Contracts */}
                        <div style={{ display: 'flex', width: '100%', flex: 1 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%', borderRight: '1px solid #e5e7eb' }}>
                                <span style={{ fontSize: '48px', fontWeight: 900, color: '#1e293b' }}>{longestStreak}</span>
                                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Best Streak</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%' }}>
                                <span style={{ fontSize: '48px', fontWeight: 900, color: '#1e293b' }}>{deployed}</span>
                                <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Contracts</span>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1000,
                height: 1000,
            },
        );
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
