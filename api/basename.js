import { createPublicClient, http, namehash } from 'viem';
import { base } from 'viem/chains';
import fetch from 'node-fetch';

// L2 Resolver Contract Address
const BASENAME_RESOLVER_ADDRESS = '0x03c4738ee98ae44591e1a4a4f3cab6641d95dd9a';
// Basename NFT Contract Address (Same as resolver/registrar usually for Basenames)
const NFT_CONTRACT_ADDRESS = '0x03c4738ee98ae44591e1a4a4f3cab6641d95dd9a';

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
        const cleanAddress = address.toLowerCase().replace('0x', '');

        // --- STRATEGY 1: Reverse Resolution (Primary Name) ---
        try {
            // Correct format for reverse node: <addr_no_0x>.addr.reverse
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
            }
        } catch (err) {
            console.log('Reverse resolution failed/empty, trying NFT fallback...');
        }

        // --- STRATEGY 2: NFT Ownership (Fallback) ---
        // Check if user owns a Basename NFT and get the first one
        try {
            const balance = await client.readContract({
                address: NFT_CONTRACT_ADDRESS,
                abi: [{
                    name: 'balanceOf',
                    type: 'function',
                    stateMutability: 'view',
                    inputs: [{ name: 'owner', type: 'address' }],
                    outputs: [{ name: 'balance', type: 'uint256' }],
                }],
                functionName: 'balanceOf',
                args: [address],
            });

            if (Number(balance) > 0) {
                // Get the first token ID owned by the user
                const tokenId = await client.readContract({
                    address: NFT_CONTRACT_ADDRESS,
                    abi: [{
                        name: 'tokenOfOwnerByIndex',
                        type: 'function',
                        stateMutability: 'view',
                        inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }],
                        outputs: [{ name: 'tokenId', type: 'uint256' }],
                    }],
                    functionName: 'tokenOfOwnerByIndex',
                    args: [address, 0n], // Index 0
                });

                // Get Token URI
                const tokenUri = await client.readContract({
                    address: NFT_CONTRACT_ADDRESS,
                    abi: [{
                        name: 'tokenURI',
                        type: 'function',
                        stateMutability: 'view',
                        inputs: [{ name: 'tokenId', type: 'uint256' }],
                        outputs: [{ name: 'uri', type: 'string' }],
                    }],
                    functionName: 'tokenURI',
                    args: [tokenId],
                });

                // Fetch Metadata
                let name = null;
                if (tokenUri.startsWith('data:application/json;base64,')) {
                    const base64Data = tokenUri.split(',')[1];
                    const jsonStr = Buffer.from(base64Data, 'base64').toString('utf-8');
                    const metadata = JSON.parse(jsonStr);
                    name = metadata.name;
                } else if (tokenUri.startsWith('http')) {
                    const metaRes = await fetch(tokenUri);
                    const metadata = await metaRes.json();
                    name = metadata.name;
                }

                if (name) {
                    return res.status(200).json({ basename: name });
                }
            }
        } catch (nftErr) {
            console.error('NFT fallback failed:', nftErr);
        }

        return res.status(404).json({ error: 'No Basename found' });

    } catch (error) {
        console.error('Basename resolution error:', error);
        return res.status(404).json({ error: 'Failed to resolve Basename' });
    }
}
