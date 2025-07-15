import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';

export interface WalletInfo {
  address: string;
  chainId: number;
  isConnected: boolean;
}

export class CoinbaseWalletService {
  private sdk: CoinbaseWalletSDK;
  private provider: any;
  private isConnected: boolean = false;
  private currentAccount: string = '';
  private chainId: number = 0;

  constructor() {
    this.sdk = new CoinbaseWalletSDK({
      appName: 'Mining cbBTC DApp',
      appLogoUrl: 'https://your-app.com/logo.png',
      darkMode: false,
      appChainIds: [8453, 84532] // Base mainnet and testnet
    });

    // Make Web3 provider with Base network as default
    this.provider = this.sdk.makeWeb3Provider('https://mainnet.base.org', 8453);
    
    // Listen to events
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (this.provider) {
      this.provider.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.handleDisconnect();
        } else {
          this.currentAccount = accounts[0];
          this.isConnected = true;
        }
      });

      this.provider.on('chainChanged', (chainId: string) => {
        this.chainId = parseInt(chainId, 16);
        // Check if we're on the correct network
        if (this.chainId !== 8453 && this.chainId !== 84532) {
          console.warn('Please switch to Base network');
        }
      });

      this.provider.on('disconnect', () => {
        this.handleDisconnect();
      });
    }
  }

  private handleDisconnect(): void {
    this.isConnected = false;
    this.currentAccount = '';
    this.chainId = 0;
  }

  async connect(): Promise<WalletInfo> {
    try {
      // Request account access
      const accounts = await this.provider.request({
        method: 'eth_requestAccounts'
      });

      if (accounts && accounts.length > 0) {
        this.currentAccount = accounts[0];
        this.isConnected = true;

        // Get chain ID
        const chainId = await this.provider.request({
          method: 'eth_chainId'
        });
        this.chainId = parseInt(chainId, 16);

        // Check if we're on Base network
        if (this.chainId !== 8453 && this.chainId !== 84532) {
          await this.switchToBase();
        }

        return {
          address: this.currentAccount,
          chainId: this.chainId,
          isConnected: this.isConnected
        };
      } else {
        throw new Error('No accounts found');
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.provider.request({
        method: 'eth_accounts'
      });
      this.handleDisconnect();
    } catch (error) {
      console.error('Error disconnecting:', error);
      // Force disconnect even if request fails
      this.handleDisconnect();
    }
  }

  async switchToBase(): Promise<void> {
    try {
      // Try to switch to Base mainnet
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }] // 8453 in hex
      });
    } catch (switchError: any) {
      // If the chain is not added, add it
      if (switchError.code === 4902) {
        await this.addBaseNetwork();
      } else {
        throw switchError;
      }
    }
  }

  async addBaseNetwork(): Promise<void> {
    try {
      await this.provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x2105', // 8453 in hex
            chainName: 'Base',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org']
          }
        ]
      });
    } catch (error) {
      console.error('Error adding Base network:', error);
      throw error;
    }
  }

  async switchToBaseSepolia(): Promise<void> {
    try {
      // Try to switch to Base Sepolia testnet
      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x14a34' }] // 84532 in hex
      });
    } catch (switchError: any) {
      // If the chain is not added, add it
      if (switchError.code === 4902) {
        await this.addBaseSepoliaNetwork();
      } else {
        throw switchError;
      }
    }
  }

  async addBaseSepoliaNetwork(): Promise<void> {
    try {
      await this.provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x14a34', // 84532 in hex
            chainName: 'Base Sepolia',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18
            },
            rpcUrls: ['https://sepolia.base.org'],
            blockExplorerUrls: ['https://sepolia.basescan.org']
          }
        ]
      });
    } catch (error) {
      console.error('Error adding Base Sepolia network:', error);
      throw error;
    }
  }

  async getBalance(): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await this.provider.request({
        method: 'eth_getBalance',
        params: [this.currentAccount, 'latest']
      });

      // Convert from wei to ether
      const balanceInEther = parseInt(balance, 16) / Math.pow(10, 18);
      return balanceInEther.toString();
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await this.provider.request({
        method: 'personal_sign',
        params: [message, this.currentAccount]
      });
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw error;
    }
  }

  async sendTransaction(to: string, value: string, data?: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const txHash = await this.provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: this.currentAccount,
            to,
            value: `0x${parseInt(value).toString(16)}`,
            data: data || '0x'
          }
        ]
      });
      return txHash;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  getProvider(): any {
    return this.provider;
  }

  getWalletInfo(): WalletInfo {
    return {
      address: this.currentAccount,
      chainId: this.chainId,
      isConnected: this.isConnected
    };
  }

  async isOnBaseNetwork(): Promise<boolean> {
    if (!this.provider) return false;
    
    try {
      const chainId = await this.provider.request({
        method: 'eth_chainId'
      });
      const numericChainId = parseInt(chainId, 16);
      return numericChainId === 8453 || numericChainId === 84532;
    } catch (error) {
      console.error('Error checking network:', error);
      return false;
    }
  }

  async getCurrentAccount(): Promise<string> {
    if (!this.provider) return '';
    
    try {
      const accounts = await this.provider.request({
        method: 'eth_accounts'
      });
      return accounts[0] || '';
    } catch (error) {
      console.error('Error getting current account:', error);
      return '';
    }
  }

  // Event listeners for React components
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (this.provider) {
      this.provider.on('accountsChanged', callback);
    }
  }

  onChainChanged(callback: (chainId: string) => void): void {
    if (this.provider) {
      this.provider.on('chainChanged', callback);
    }
  }

  onDisconnect(callback: () => void): void {
    if (this.provider) {
      this.provider.on('disconnect', callback);
    }
  }

  // Remove event listeners
  removeAllListeners(): void {
    if (this.provider) {
      this.provider.removeAllListeners();
    }
  }

  // Static method to check if Coinbase Wallet is available
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.ethereum;
  }

  // Get network name
  getNetworkName(): string {
    switch (this.chainId) {
      case 8453:
        return 'Base Mainnet';
      case 84532:
        return 'Base Sepolia Testnet';
      case 1:
        return 'Ethereum Mainnet';
      default:
        return `Unknown Network (${this.chainId})`;
    }
  }
}