import fetch from 'node-fetch';

/**
 * GET /api/etherscan?address=0x...
 * Returns native balance (in ETH) for the given address using Etherscan (or BaseScan) API.
 */
export default async function handler(req, res) {
    const { address } = req.query;
    if (!address) {
        return res.status(400).json({ error: 'Missing address query parameter' });
    }
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Etherscan API key not configured' });
    }
    // Using Etherscan API for Base (or Ethereum). Adjust base URL if needed.
    const url = `https://api.etherscan.io/api?module=account&action=balance&address=${encodeURIComponent(address)}&tag=latest&apikey=${apiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Etherscan request failed: ${response.status} ${txt}`);
        }
        const data = await response.json();
        if (data.status !== '1') {
            throw new Error(`Etherscan error: ${data.message}`);
        }
        // Balance is returned in wei, convert to ETH (as string)
        const wei = BigInt(data.result);
        const eth = Number(wei) / 1e18;
        return res.status(200).json({ success: true, balance: eth.toString() });
    } catch (err) {
        console.error('Etherscan fetch error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
