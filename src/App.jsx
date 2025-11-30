import React, { useState, useEffect, useCallback } from 'react';

// This component handles wallet operations directly using the window.ethereum API for Base/Farcaster compatibility.
const App = () => {
  // State variables
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Default Base-themed placeholder for the NFT image
  const [nftImageUrl, setNftImageUrl] = useState('https://placehold.co/400x400/24375A/FFFFFF?text=BaseNFT+Image'); 
  
  const [isMinting, setIsMinting] = useState(false);
  const [isCasting, setIsCasting] = useState(false);

  // Tailwind CSS classes for the desired look and feel (Base Blue Theme)
  const buttonClass = "px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center transform hover:scale-[1.02]";
  const cardClass = "bg-white p-8 rounded-2xl shadow-3xl border border-gray-200 w-full max-w-lg mx-auto";
  const baseBlue = 'text-blue-600';

  // Check if wallet is connected
  const isWalletConnected = address !== null;

  // Function to clear error and success messages
  const clearMessages = () => {
    setError('');
    setMessage('');
  };

  /**
   * Initiates wallet connection using the Ethereum provider (window.ethereum).
   */
  const connectWallet = useCallback(async () => {
    clearMessages();
    
    if (typeof window.ethereum === 'undefined') {
      setError('Please install a Web3 wallet (e.g., Metamask).');
      return;
    }

    try {
      // Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

      if (accounts.length > 0) {
        setAddress(accounts[0]);
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        setChainId(parseInt(currentChainId, 16));
        setMessage(`Wallet connected successfully! Chain ID: ${parseInt(currentChainId, 16)}`);
        
        // Fetch NFT image on successful connection
        fetchNftImage();
      } else {
        setError('No accounts found.');
      }
    } catch (err) {
      console.error(err);
      if (err.code === 4001) {
        setError('Connection request rejected by user.');
      } else {
        setError('An error occurred while connecting the wallet.');
      }
    }
  }, []);

  /**
   * Simulation to fetch NFT image URL (uses placeholders for visual consistency).
   */
  const fetchNftImage = () => {
    // Simulation: Select a random Base-themed placeholder image
    const mockNftUrls = [
      'https://placehold.co/400x400/24375A/FFFFFF?text=BaseCard+NFT+%231',
      'https://placehold.co/400x400/1E3A8A/FFFFFF?text=BaseCard+NFT+%232',
      'https://placehold.co/400x400/1D4ED8/FFFFFF?text=BaseCard+NFT+%233',
    ];
    const newImage = mockNftUrls[Math.floor(Math.random() * mockNftUrls.length)];
    setNftImageUrl(newImage);
  };

  /**
   * Simulates the NFT minting process.
   */
  const mintNft = async () => {
    clearMessages();
    if (!isWalletConnected) {
      setError('Please connect your wallet first.');
      return;
    }
    
    setIsMinting(true);
    
    // In a real application, this would send a transaction to the NFT contract on Base.
    
    try {
      // Simulation: wait for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      setMessage('NFT successfully minted! Time to Cast on Farcaster.');
      
    } catch (err) {
      console.error("Mint error:", err);
      setError('An error occurred during NFT minting or transaction was rejected.');
    } finally {
      setIsMinting(false);
    }
  };
  
  /**
   * Initiates the Farcaster cast (share) after minting.
   */
  const castToFarcaster = async () => {
    clearMessages();
    if (!address) {
      setError('Please connect your wallet first.');
      return;
    }
    
    setIsCasting(true);

    // Placeholder link for the NFT (adjust to your actual contract/token logic)
    const nftLink = `https://opensea.io/assets/${chainId === 8453 ? 'base' : 'ethereum'}/${address}/1`; 
    
    const castText = `Just minted this awesome NFT on Base! Check it out: ${nftLink}`;
    
    // Farcaster/Warpcast sharing Deep Link
    const castUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(castText)}`;
    
    try {
      // Opens the sharing window in a new tab
      window.open(castUrl, '_blank');
      setMessage('Farcaster share window opened. You can send your Cast.');
      
    } catch (e) {
      console.error("Cast error:", e);
      setError('An error occurred while attempting to Cast.');
    } finally {
      setIsCasting(false);
    }
  };


  /**
   * Listens for wallet events: account change and network change.
   */
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setMessage('Account changed.');
          fetchNftImage();
        } else {
          setAddress(null);
          setMessage('Wallet disconnected.');
          setNftImageUrl('https://placehold.co/400x400/24375A/FFFFFF?text=BaseNFT+Image');
        }
      };

      const handleChainChanged = (newChainId) => {
        const newId = parseInt(newChainId, 16);
        setChainId(newId);
        setMessage(`Network changed. New Chain ID: ${newId}`);
      };

      // Add event listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Check current status on initial load
      (async () => {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAddress(accounts[0]);
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            setChainId(parseInt(currentChainId, 16));
            fetchNftImage();
          }
        } catch (e) {
          console.error("Initial status check failed:", e);
        }
      })();

      // Cleanup listeners when component unmounts
      return () => {
        if (window.ethereum.removeListener) {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // UI Rendering
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className={cardClass}>
        <h1 className={`text-4xl font-extrabold ${baseBlue} mb-2 text-center`}>
          BasePrint
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">
          Base & Farcaster Compatible NFT Mint Experience
        </p>

        {/* NFT Card Image Area */}
        <div className="mb-6 flex justify-center">
          <div className="w-full max-w-xs h-auto aspect-square bg-gray-900 rounded-xl overflow-hidden shadow-2xl transition duration-500 hover:shadow-blue-500/50">
            <img 
              src={nftImageUrl} 
              alt="NFT Image" 
              className="object-cover w-full h-full"
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = 'https://placehold.co/400x400/FF0000/FFFFFF?text=Image+Load+Error'; 
              }}
            />
          </div>
        </div>

        {/* Wallet Info Card */}
        <div className="mb-6 p-4 bg-gray-50 border border-blue-200 rounded-lg text-sm">
          <p className="font-medium text-gray-700 flex justify-between items-center">
            Connection Status: 
            <span className={`ml-2 font-bold ${isWalletConnected ? 'text-green-600' : 'text-red-600'} flex items-center`}>
              {isWalletConnected ? (
                 <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
              ) : (
                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
              )}
              {isWalletConnected ? 'Connected' : 'Disconnected'}
            </span>
          </p>
          {isWalletConnected && (
            <>
              <p className="font-medium text-gray-700 mt-2">Address:</p>
              <p className="font-mono break-all bg-gray-100 p-2 rounded text-xs border border-gray-200">
                {address}
              </p>
              <p className="font-medium text-gray-700 mt-2">Chain ID:</p>
              <p className="font-mono bg-gray-100 p-2 rounded text-xs border border-gray-200">
                {chainId ? chainId : 'Unknown'}
              </p>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm font-medium" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {/* Success/Info Message */}
        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 text-sm font-medium" role="status">
            <strong className="font-bold">Info: </strong>
            <span className="block sm:inline">{message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4 pt-2">
          {!isWalletConnected && (
            <button
              onClick={connectWallet}
              className={buttonClass + ' w-full'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M20 7.07V4h-3.07L12 1.07 7.07 4H4v3.07L1 12l3 4.93V20h3.07L12 22.93 16.93 20H20v-3.07L23 12zM12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12z"/><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>
              Connect Wallet
            </button>
          )}

          {isWalletConnected && !message.includes('NFT successfully minted') && (
            <button
              onClick={mintNft}
              className={buttonClass + ' w-full bg-blue-500 hover:bg-blue-600'}
              disabled={isMinting}
            >
              {isMinting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Minting NFT...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17 19h2c.55 0 1-.45 1-1V6c0-.55-.45-1-1-1H5c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h2"/><path d="M8 17h8V9H8v8zm2-6h4v4h-4zM5 7h14v2H5z"/></svg>
                  Mint NFT (Base Network)
                </>
              )}
            </button>
          )}
          
          {/* Cast button is enabled when the Mint process is assumed successful */}
          {isWalletConnected && message.includes('NFT successfully minted') && (
            <button
              onClick={castToFarcaster}
              className={buttonClass + ' w-full bg-purple-600 hover:bg-purple-700'}
              disabled={isCasting}
            >
              {isCasting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Casting...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M19 1h-2v4h2V1zM5 23h2v-4H5v4zm14-12v2h-2v-2h2zm-2 4h-2v4h2v-4zM7 5H5V1h2v4zm10-4h-2v4h2V1zm-8 8h-2v2h2V9zm2 4h-2v2h2v-2zm-2 4h-2v2h2v-2zm4 0h-2v2h2v-2zm-4-4h-2v2h2v-2zm2-4h-2v2h2V9zm4 4h-2v2h2v-2zm-4 4h-2v2h2v-2zm8-12h-2v2h2V7zm-2 4h-2v2h2v-2zm2 4h-2v2h2v-2zm-8-8h-2v2h2V7zm2 4h-2v2h2v-2zM7 9H5v2h2V9zM5 13H3v2h2v-2zM5 17H3v2h2v-2zm12-4h-2v2h2v-2zm-2 4h-2v2h2v-2zm4-12h-2v2h2V7z"/></svg>
                  Share Mint on Farcaster (Cast)
                </>
              )}
            </button>
          )}
          
          <p className="text-xs text-gray-500 pt-2 text-center">
            **Important:** Wallet connection and Mint operation are simulated. The Cast button redirects you to the Warpcast share page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
