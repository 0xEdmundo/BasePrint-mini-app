import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const CONTRACT_ADDRESS = '0x66fADf7f93A4407DD336C35cD09ccDA58559442b';

const client = createPublicClient({
    chain: base,
    transport: http(),
});

/**
 * Check if an address owns a BasePrint NFT
 * @param address - The wallet address to check
 * @returns true if the address owns at least one BasePrint NFT
 */
export async function checkNFTOwnership(address: string): Promise<boolean> {
    try {
        const balance = await client.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: [
                {
                    name: 'balanceOf',
                    type: 'function',
                    stateMutability: 'view',
                    inputs: [{ name: 'owner', type: 'address' }],
                    outputs: [{ type: 'uint256' }],
                },
            ],
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
        }) as bigint;

        return balance > 0n;
    } catch (error) {
        console.error('Error checking NFT ownership:', error);
        return false;
    }
}

/**
 * Get daily search limit status for a specific wallet
 * Resets at 12:00 AM UTC (00:00 UTC)
 */
export function getDailySearchStatus(walletAddress?: string): { count: number; remaining: number; canSearch: boolean } {
    const MAX_SEARCHES = 3;
    const today = new Date().toISOString().split('T')[0]; // UTC date string

    // Use wallet-specific key if address provided
    const storageKey = walletAddress
        ? `baseprint_search_${walletAddress.toLowerCase()}`
        : 'baseprint_search_limit';

    try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            const data = JSON.parse(stored);
            if (data.date === today) {
                const remaining = MAX_SEARCHES - data.count;
                return {
                    count: data.count,
                    remaining,
                    canSearch: remaining > 0,
                };
            }
        }
    } catch (e) {
        console.error('Error reading search limit:', e);
    }

    // New day or no data - reset
    return { count: 0, remaining: MAX_SEARCHES, canSearch: true };
}

/**
 * Increment the daily search count for a specific wallet
 */
export function incrementSearchCount(walletAddress?: string): void {
    const today = new Date().toISOString().split('T')[0];
    const status = getDailySearchStatus(walletAddress);

    // Use wallet-specific key if address provided
    const storageKey = walletAddress
        ? `baseprint_search_${walletAddress.toLowerCase()}`
        : 'baseprint_search_limit';

    try {
        localStorage.setItem(storageKey, JSON.stringify({
            date: today,
            count: status.count + 1,
        }));
    } catch (e) {
        console.error('Error saving search count:', e);
    }
}
