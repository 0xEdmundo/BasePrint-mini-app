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

        // Farcaster uses 1.91:1 aspect ratio (1200x630)
        // Card fills entire canvas - no grey borders, no cropping issues
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
                    {/* TOP SECTION: Profile & Gradient - 260px */}
                    <div
                        style={{
                            display: 'flex',
                            width: '100%',
                            height: '260px',
                            position: 'relative',
                            background: 'linear-gradient(135deg, #0052FF 0%, #0042cc 50%, #002980 100%)',
                            padding: '24px 32px',
                            color: 'white',
                        }}
                    >
                        {/* Profile Content */}
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'space-between', zIndex: 10 }}>

                            {/* Header Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {/* Logo Circle */}
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: '#0052FF' }}></div>
                                    </div>
                                    <span style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.05em' }}>BasePrint</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {isVerified && (
                                        <div style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', backgroundColor: 'rgba(59, 130, 246, 0.9)', borderRadius: '999px', border: '1px solid #60A5FA' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verified</span>
                                        </div>
                                    )}
                                    <span style={{ fontSize: '12px', color: '#BFDBFE', fontFamily: 'monospace' }}>FID: {fid}</span>
                                </div>
                            </div>

                            {/* Profile Info Row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                {/* PFP */}
                                <img
                                    src={pfp}
                                    width="80"
                                    height="80"
                                    style={{ borderRadius: '50%', border: '3px solid white', objectFit: 'cover' }}
                                />

                                {/* Text Details */}
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1.1 }}>
                                        {displayName}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '16px', color: '#BFDBFE' }}>
                                            @{username}
                                        </span>
                                        {basename && (
                                            <span style={{ backgroundColor: 'white', color: '#0052FF', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
                                                {basename}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Score Bar */}
                            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '10px', color: '#BFDBFE', fontWeight: 700, textTransform: 'uppercase' }}>Neynar Score</span>
                                    <span style={{ fontSize: '20px', fontWeight: 900, lineHeight: 1 }}>{parseFloat(score.toString()).toFixed(2)}</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                                    <div style={{ width: `${score * 100}%`, height: '100%', background: 'linear-gradient(to right, #86efac, #22c55e)' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Background Elements */}
                        <div style={{ position: 'absolute', right: '-50px', top: '-50px', width: '250px', height: '250px', backgroundColor: '#22d3ee', opacity: 0.1, borderRadius: '50%', filter: 'blur(60px)' }}></div>
                    </div>

                    {/* BOTTOM SECTION: Stats Grid - 370px */}
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, backgroundColor: 'white' }}>

                        {/* Row 1: Main Metrics */}
                        <div style={{ display: 'flex', width: '100%', height: '120px', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '33.33%', borderRight: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: '36px', fontWeight: 900, color: '#1e293b' }}>{daysActive}</span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Days</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '33.33%', borderRight: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: '36px', fontWeight: 900, color: '#1e293b' }}>{walletAge}</span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wallet Age</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '33.33%' }}>
                                <span style={{ fontSize: '36px', fontWeight: 900, color: '#1e293b' }}>{txCount}</span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total TXs</span>
                            </div>
                        </div>

                        {/* Row 2: Bridge & DeFi */}
                        <div style={{ display: 'flex', width: '100%', height: '120px', borderBottom: '1px solid #f3f4f6' }}>
                            {/* Bridge */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%', borderRight: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Bridge Activity</span>
                                <div style={{ display: 'flex', gap: '24px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b' }}>{bridgeToEth}</span>
                                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>Base→ETH</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#1e293b' }}>{bridgeFromEth}</span>
                                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>ETH→Base</span>
                                    </div>
                                </div>
                            </div>
                            {/* DeFi */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%' }}>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>DeFi Activity</span>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b' }}>{defiSwap}</span>
                                        <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 600 }}>Swap</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b' }}>{defiLend}</span>
                                        <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 600 }}>Lend</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b' }}>{defiBorrow}</span>
                                        <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 600 }}>Borrow</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{ fontSize: '20px', fontWeight: 900, color: '#1e293b' }}>{defiStake}</span>
                                        <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 600 }}>Stake</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Row 3: Streaks & Deployed */}
                        <div style={{ display: 'flex', width: '100%', flex: 1 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '33.33%', borderRight: '1px solid #f3f4f6', backgroundColor: '#eff6ff' }}>
                                <span style={{ fontSize: '32px', fontWeight: 900, color: '#0052FF' }}>{currentStreak}</span>
                                <span style={{ fontSize: '10px', color: '#0052FF', fontWeight: 700, textTransform: 'uppercase' }}>Current Streak</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '33.33%', borderRight: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b' }}>{longestStreak}</span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Best Streak</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '33.33%' }}>
                                <span style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b' }}>{deployed}</span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Contracts</span>
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
