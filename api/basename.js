import { createPublicClient, http, namehash } from 'viem';
import { base } from 'viem/chains';

// L2 Resolver Contract Address provided by user
const BASENAME_RESOLVER_ADDRESS = '0x03c4738ee98ae44591e1a4a4f3cab6641d95dd9a';

// Create a public client for Base
const client = createPublicClient({
    chain: base,
    transport: http(),
});

export default async function handler(req, res) {
    const { address } = req.query;

    if (!address) {
        return res.status(400).json({ error: 'Missing address parameter' });
    }

    try {
        // Reverse Resolution Logic for Basenames (L2)
        // 1. Ensure address is lowercase and remove '0x' prefix if present for namehash string construction
        const cleanAddress = address.toLowerCase().replace('0x', '');

        // 2. Calculate the reverse node: namehash(address_no_0x + '.addr.reverse')
        const reverseNode = namehash(`${cleanAddress}.addr.reverse`);

        const name = await client.readContract({
            address: BASENAME_RESOLVER_ADDRESS,
            abi: [{
                name: 'name',
                type: 'function',
                stateMutability: 'view',
                inputs: [{ name: 'node', type: 'bytes32' }],
                outputs: [{ name: 'ret', type: 'string' }],
            }],
            functionName: 'name',
            args: [reverseNode],
        });

        if (name) {
            return res.status(200).json({ basename: name });
        } else {
            return res.status(404).json({ error: 'No Basename found' });
        }
    } catch (error) {
        console.error('Basename resolution error:', error);
        // Return 404 on error to simply indicate "not found" to the frontend
        return res.status(404).json({ error: 'Failed to resolve Basename' });
    }
}
