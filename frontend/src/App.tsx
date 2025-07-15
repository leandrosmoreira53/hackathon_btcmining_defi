import React, { useState } from 'react';
import { CoinbaseWalletConnector } from './components/wallet/CoinbaseWalletConnector';
import { CleanMiningInterface } from './components/CleanMiningInterface';
import { useWeb3 } from './hooks/useWeb3';
import { useCoinbaseWallet } from './hooks/useCoinbaseWallet';

function App() {
  const { web3Service, initializeWeb3 } = useWeb3();
  const { walletInfo } = useCoinbaseWallet();

  const handleWalletConnected = async (walletService: any) => {
    try {
      await initializeWeb3(walletService);
    } catch (error) {
      console.error('Failed to initialize Web3:', error);
    }
  };

  return (
    <div className="app">
      {/* Wallet Connection (Floating) */}
      {!walletInfo.isConnected && (
        <div className="floating-wallet">
          <CoinbaseWalletConnector onWalletConnected={handleWalletConnected} />
        </div>
      )}

      {/* Main Interface */}
      {walletInfo.isConnected ? (
        <CleanMiningInterface 
          web3Service={web3Service}
          userAddress={walletInfo.address}
        />
      ) : (
        <div className="welcome-screen">
          <div className="welcome-content">
            <h1>⚡ Bitcoin Mining Tokenization</h1>
            <p>Own fractions of real Antminer S21+ and earn daily USDC</p>
            <div className="connect-prompt">
              <p>Connect your Coinbase Wallet to get started</p>
              <div className="arrow-down">↓</div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .app {
          min-height: 100vh;
          background: #f8fafc;
        }

        .floating-wallet {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          max-width: 400px;
        }

        .welcome-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          padding: 20px;
        }

        .welcome-content h1 {
          font-size: 3.5rem;
          font-weight: 800;
          margin-bottom: 16px;
          line-height: 1.2;
        }

        .welcome-content > p {
          font-size: 1.3rem;
          opacity: 0.9;
          margin-bottom: 60px;
          max-width: 600px;
        }

        .connect-prompt {
          margin-top: 40px;
        }

        .connect-prompt p {
          font-size: 1.1rem;
          margin-bottom: 20px;
          opacity: 0.8;
        }

        .arrow-down {
          font-size: 2rem;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }

        @media (max-width: 768px) {
          .welcome-content h1 {
            font-size: 2.5rem;
          }

          .welcome-content > p {
            font-size: 1.1rem;
          }

          .floating-wallet {
            position: relative;
            top: auto;
            right: auto;
            margin: 20px;
            max-width: none;
          }

          .welcome-screen {
            min-height: calc(100vh - 100px);
          }
        }
      `}</style>
    </div>
  );
}

export default App;