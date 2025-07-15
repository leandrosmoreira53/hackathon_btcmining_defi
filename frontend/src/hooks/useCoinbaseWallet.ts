import { useState, useEffect, useCallback } from 'react';
import { CoinbaseWalletService, WalletInfo } from '../services/coinbaseWalletService';

interface UseCoinbaseWalletReturn {
  walletInfo: WalletInfo;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchToBase: () => Promise<void>;
  getBalance: () => Promise<string>;
  walletService: CoinbaseWalletService;
}

export const useCoinbaseWallet = (): UseCoinbaseWalletReturn => {
  const [walletService] = useState(() => new CoinbaseWalletService());
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    address: '',
    chainId: 0,
    isConnected: false
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update wallet info from service
  const updateWalletInfo = useCallback(() => {
    const info = walletService.getWalletInfo();
    setWalletInfo(info);
  }, [walletService]);

  // Connect wallet
  const connect = useCallback(async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const info = await walletService.connect();
      setWalletInfo(info);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [walletService, isConnecting]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await walletService.disconnect();
      setWalletInfo({
        address: '',
        chainId: 0,
        isConnected: false
      });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect wallet');
      console.error('Wallet disconnection error:', err);
    }
  }, [walletService]);

  // Switch to Base network
  const switchToBase = useCallback(async () => {
    try {
      await walletService.switchToBase();
      updateWalletInfo();
    } catch (err: any) {
      setError(err.message || 'Failed to switch to Base network');
      console.error('Network switch error:', err);
    }
  }, [walletService, updateWalletInfo]);

  // Get balance
  const getBalance = useCallback(async (): Promise<string> => {
    try {
      return await walletService.getBalance();
    } catch (err: any) {
      setError(err.message || 'Failed to get balance');
      console.error('Balance fetch error:', err);
      return '0';
    }
  }, [walletService]);

  // Setup event listeners on mount
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setWalletInfo({
          address: '',
          chainId: 0,
          isConnected: false
        });
      } else {
        updateWalletInfo();
      }
    };

    const handleChainChanged = (chainId: string) => {
      updateWalletInfo();
      
      // Check if we're on the correct network
      const numericChainId = parseInt(chainId, 16);
      if (numericChainId !== 8453 && numericChainId !== 84532) {
        setError('Please switch to Base network');
      } else {
        setError(null);
      }
    };

    const handleDisconnect = () => {
      setWalletInfo({
        address: '',
        chainId: 0,
        isConnected: false
      });
      setError(null);
    };

    // Set up event listeners
    walletService.onAccountsChanged(handleAccountsChanged);
    walletService.onChainChanged(handleChainChanged);
    walletService.onDisconnect(handleDisconnect);

    // Check if already connected on mount
    const checkConnection = async () => {
      try {
        const currentAccount = await walletService.getCurrentAccount();
        if (currentAccount) {
          const isOnBase = await walletService.isOnBaseNetwork();
          if (isOnBase) {
            updateWalletInfo();
          } else {
            setError('Please switch to Base network');
          }
        }
      } catch (err) {
        console.error('Error checking connection on mount:', err);
      }
    };

    checkConnection();

    // Cleanup event listeners on unmount
    return () => {
      walletService.removeAllListeners();
    };
  }, [walletService, updateWalletInfo]);

  return {
    walletInfo,
    isConnecting,
    error,
    connect,
    disconnect,
    switchToBase,
    getBalance,
    walletService
  };
};