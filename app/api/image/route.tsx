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
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f1f5f9',
                        fontFamily: '"Inter", sans-serif',
                    }}
                >
                    {/* Card Container */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            width: '1000px',
                            height: '600px',
                            margin: 'auto', // Enforce centering
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
                                height: '280px',
                                position: 'relative',
                                background: 'linear-gradient(135deg, #0052FF 0%, #0042cc 50%, #002980 100%)',
                                padding: '30px',
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
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#0052FF' }}></div>
                                        </div>
                                        <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.05em' }}>BasePrint</span>
                                    </div>

                                    {isVerified && (
                                        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', backgroundColor: 'rgba(59, 130, 246, 0.9)', borderRadius: '999px', border: '1px solid #60A5FA' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verified</span>
                                        </div>
                                    )}
                                </div>

                                {/* Profile Info Row */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                                    {/* PFP */}
                                    <img
                                        src={pfp}
                                        width="100"
                                        height="100"
                                        style={{ borderRadius: '50%', border: '3px solid white', objectFit: 'cover' }}
                                    />

                                    {/* Text Details */}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '12px', color: '#BFDBFE', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>
                                            FID: {fid}
                                        </span>
                                        <span style={{ fontSize: '36px', fontWeight: 900, lineHeight: 1, marginBottom: '2px' }}>
                                            {displayName}
                                        </span>
                                        <span style={{ fontSize: '16px', color: '#BFDBFE' }}>
                                            @{username}
                                        </span>
                                        {basename && (
                                            <div style={{ marginTop: '8px', display: 'flex' }}>
                                                <span style={{ backgroundColor: 'white', color: '#0052FF', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700 }}>
                                                    {basename}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Score Bar */}
                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '11px', color: '#BFDBFE', fontWeight: 700, textTransform: 'uppercase' }}>Neynar Score</span>
                                        <span style={{ fontSize: '24px', fontWeight: 900, lineHeight: 1 }}>{parseFloat(score.toString()).toFixed(2)}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '10px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                                        <div style={{ width: `${score * 100}%`, height: '100%', background: 'linear-gradient(to right, #86efac, #22c55e)' }}></div>
                                    </div>
                                    {mintDate && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                                            <span style={{ fontSize: '10px', color: '#BFDBFE', fontFamily: 'monospace' }}>
                                                Minted: {mintDate}
                                            </span>
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Decorative Background Elements */}
                            <div style={{ position: 'absolute', right: '0px', top: '0px', width: '250px', height: '250px', backgroundColor: '#22d3ee', opacity: 0.1, borderRadius: '50%', filter: 'blur(60px)' }}></div>
                        </div>

                        {/* 2. BOTTOM SECTION: Stats Grid */}
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '320px', backgroundColor: 'white' }}>

                            {/* Row 1: Main Metrics */}
                            <div style={{ display: 'flex', width: '100%', height: '33.33%', borderBottom: '1px solid #f3f4f6' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '33.33%', borderRight: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#1e293b' }}>{daysActive}</span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Days</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '33.33%', borderRight: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#1e293b' }}>{walletAge}</span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wallet Age</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '33.33%' }}>
                                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#1e293b' }}>{txCount}</span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total TXs</span>
                                </div>
                            </div>

                            {/* Row 2: Bridge & DeFi */}
                            <div style={{ display: 'flex', width: '100%', height: '33.33%', borderBottom: '1px solid #f3f4f6' }}>
                                {/* Bridge */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%', borderRight: '1px solid #f3f4f6', padding: '10px' }}>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Bridge Activity</span>
                                    <div style={{ display: 'flex', gap: '20px' }}>
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
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '50%', padding: '10px' }}>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>DeFi Activity</span>
                                    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
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
                            <div style={{ display: 'flex', width: '100%', height: '33.33%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '33.33%', borderRight: '1px solid #f3f4f6', backgroundColor: '#eff6ff' }}>
                                    <span style={{ fontSize: '32px', fontWeight: 900, color: '#0052FF' }}>{currentStreak}</span>
                                    <span style={{ fontSize: '11px', color: '#0052FF', fontWeight: 700, textTransform: 'uppercase' }}>Current Streak</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '33.33%', borderRight: '1px solid #f3f4f6' }}>
                                    <span style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b' }}>{longestStreak}</span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Best Streak</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '33.33%' }}>
                                    <span style={{ fontSize: '32px', fontWeight: 900, color: '#1e293b' }}>{deployed}</span>
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Contracts</span>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 800,
            },
        );
    } catch (e: any) {
        console.log(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
