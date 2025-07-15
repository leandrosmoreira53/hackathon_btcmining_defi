import { useState, useEffect, useCallback } from 'react';
import { Web3Service, ContractAddresses } from '../services/web3Service';
import { CoinbaseWalletService } from '../services/coinbaseWalletService';

interface UseWeb3Return {
  web3Service: Web3Service | null;
  isInitialized: boolean;
  error: string | null;
  initializeWeb3: (walletService: CoinbaseWalletService) => Promise<void>;
}

const CONTRACT_ADDRESSES: ContractAddresses = {
  miningPool: process.env.REACT_APP_MINING_POOL_ADDRESS || '',
  miningToken: process.env.REACT_APP_MINING_TOKEN_ADDRESS || '',
  chainlinkOracle: process.env.REACT_APP_CHAINLINK_ORACLE_ADDRESS || '',
  aaveIntegration: process.env.REACT_APP_AAVE_INTEGRATION_ADDRESS || '',
  cbBTC: process.env.REACT_APP_CBBTC_TOKEN_ADDRESS || '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'
};

export const useWeb3 = (): UseWeb3Return => {
  const [web3Service, setWeb3Service] = useState<Web3Service | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeWeb3 = useCallback(async (walletService: CoinbaseWalletService) => {
    try {
      setError(null);
      
      const provider = walletService.getProvider();
      if (!provider) {
        throw new Error('No provider available from wallet service');
      }

      // Check if all contract addresses are provided
      const missingAddresses = Object.entries(CONTRACT_ADDRESSES)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

      if (missingAddresses.length > 0) {
        console.warn('Missing contract addresses:', missingAddresses);
        // For development, we'll continue with empty addresses
        // In production, you should throw an error here
      }

      const service = new Web3Service(provider, CONTRACT_ADDRESSES);
      setWeb3Service(service);
      setIsInitialized(true);
      
      console.log('Web3 service initialized with contracts:', CONTRACT_ADDRESSES);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Web3 service');
      console.error('Web3 initialization error:', err);
      setIsInitialized(false);
    }
  }, []);

  return {
    web3Service,
    isInitialized,
    error,
    initializeWeb3
  };
};