import React from 'react';
import { useCoinbaseWallet } from '../../hooks/useCoinbaseWallet';

interface CoinbaseWalletConnectorProps {
  onWalletConnected?: (walletService: any) => void;
}

export const CoinbaseWalletConnector: React.FC<CoinbaseWalletConnectorProps> = ({
  onWalletConnected
}) => {
  const {
    walletInfo,
    isConnecting,
    error,
    connect,
    disconnect,
    switchToBase,
    getBalance,
    walletService
  } = useCoinbaseWallet();

  const [balance, setBalance] = React.useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = React.useState(false);

  // Fetch balance when wallet is connected
  React.useEffect(() => {
    if (walletInfo.isConnected) {
      fetchBalance();
      onWalletConnected?.(walletService);
    }
  }, [walletInfo.isConnected, onWalletConnected, walletService]);

  const fetchBalance = async () => {
    setIsLoadingBalance(true);
    try {
      const bal = await getBalance();
      setBalance(bal);
    } catch (err) {
      console.error('Error fetching balance:', err);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleConnect = async () => {
    await connect();
  };

  const handleDisconnect = async () => {
    await disconnect();
    setBalance('0');
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num < 0.0001) return '< 0.0001';
    return num.toFixed(4);
  };

  const getNetworkName = () => {
    switch (walletInfo.chainId) {
      case 8453:
        return 'Base Mainnet';
      case 84532:
        return 'Base Sepolia';
      default:
        return 'Unknown Network';
    }
  };

  const isCorrectNetwork = walletInfo.chainId === 8453 || walletInfo.chainId === 84532;

  return (
    <div className=\"wallet-connector\">
      {!walletInfo.isConnected ? (
        <div className=\"connect-section\">
          <h3>Connect Your Coinbase Wallet</h3>
          <p>Connect your Coinbase Wallet to start mining cbBTC and earning DeFi yields</p>
          
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className=\"connect-button\"
          >
            {isConnecting ? 'Connecting...' : 'Connect Coinbase Wallet'}
          </button>
          
          {error && (
            <div className=\"error-message\">
              <p>❌ {error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className=\"wallet-info\">
          <div className=\"wallet-header\">
            <h3>🔗 Wallet Connected</h3>
            <button onClick={handleDisconnect} className=\"disconnect-button\">
              Disconnect
            </button>
          </div>
          
          <div className=\"wallet-details\">
            <div className=\"detail-item\">
              <span className=\"label\">Address:</span>
              <span className=\"value\">{formatAddress(walletInfo.address)}</span>
            </div>
            
            <div className=\"detail-item\">
              <span className=\"label\">Network:</span>
              <span className={`value ${isCorrectNetwork ? 'correct-network' : 'wrong-network'}`}>
                {getNetworkName()}
                {!isCorrectNetwork && (
                  <button onClick={switchToBase} className=\"switch-network-button\">
                    Switch to Base
                  </button>
                )}
              </span>
            </div>
            
            <div className=\"detail-item\">
              <span className=\"label\">ETH Balance:</span>
              <span className=\"value\">
                {isLoadingBalance ? (
                  'Loading...'
                ) : (
                  <>
                    {formatBalance(balance)} ETH
                    <button onClick={fetchBalance} className=\"refresh-button\">
                      🔄
                    </button>
                  </>
                )}
              </span>
            </div>
          </div>
          
          {!isCorrectNetwork && (
            <div className=\"network-warning\">
              <p>⚠️ Please switch to Base network to use this application</p>
              <button onClick={switchToBase} className=\"switch-network-button-large\">
                Switch to Base Network
              </button>
            </div>
          )}
          
          {error && (
            <div className=\"error-message\">
              <p>❌ {error}</p>
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        .wallet-connector {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 24px;
          color: white;
          margin-bottom: 24px;
        }
        
        .connect-section {
          text-align: center;
        }
        
        .connect-section h3 {
          margin: 0 0 8px 0;
          font-size: 1.5rem;
          font-weight: 600;
        }
        
        .connect-section p {
          margin: 0 0 24px 0;
          opacity: 0.9;
          font-size: 0.95rem;
        }
        
        .connect-button {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        
        .connect-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
        }
        
        .connect-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .wallet-info {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .wallet-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .wallet-header h3 {
          margin: 0;
          font-size: 1.3rem;
          font-weight: 600;
        }
        
        .disconnect-button {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .disconnect-button:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .wallet-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .detail-item:last-child {
          border-bottom: none;
        }
        
        .label {
          font-weight: 500;
          opacity: 0.8;
        }
        
        .value {
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .correct-network {
          color: #4ade80;
        }
        
        .wrong-network {
          color: #f87171;
        }
        
        .switch-network-button {
          background: #ef4444;
          border: none;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .switch-network-button:hover {
          background: #dc2626;
        }
        
        .refresh-button {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 0.9rem;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }
        
        .refresh-button:hover {
          opacity: 1;
        }
        
        .network-warning {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }
        
        .network-warning p {
          margin: 0 0 12px 0;
          font-weight: 500;
        }
        
        .switch-network-button-large {
          background: #ef4444;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .switch-network-button-large:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }
        
        .error-message {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-top: 12px;
        }
        
        .error-message p {
          margin: 0;
          font-size: 0.9rem;
        }
        
        @media (max-width: 640px) {
          .wallet-connector {
            padding: 16px;
          }
          
          .wallet-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
          
          .detail-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
};