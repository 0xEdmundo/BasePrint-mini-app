import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
    chain: base,
    transport: http(),
});

const CONTRACT = '0x685Ea8972b1f3E63Ab7c8826f3B53CaCD4737bB2';

async function main() {
    try {
        // 1. Check tokenURI for a sample token (e.g., 1)
        try {
            const uri = await client.readContract({
                address: CONTRACT,
                abi: parseAbi(['function tokenURI(uint256) view returns (string)']),
                functionName: 'tokenURI',
                args: [1n],
            });
            console.log('Token URI (1):', uri);
        } catch (e) {
            console.log('Could not read tokenURI(1)');
        }

        // 2. Check if we can read identity data
        // Try common names: identities, getIdentity, identity
        const abi = parseAbi([
            'function identities(uint256) view returns (string, uint256, uint256, uint256, string)',
            'function getIdentity(uint256) view returns (string, uint256, uint256, uint256, string)'
        ]);

        try {
            const data = await client.readContract({
                address: CONTRACT,
                abi: abi,
                functionName: 'identities',
                args: [1n],
            });
            console.log('Identities(1):', data);
        } catch (e) {
            console.log('Could not read identities(1)');
            try {
                const data = await client.readContract({
                    address: CONTRACT,
                    abi: abi,
                    functionName: 'getIdentity',
                    args: [1n],
                });
                console.log('getIdentity(1):', data);
            } catch (e2) {
                console.log('Could not read getIdentity(1)');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
