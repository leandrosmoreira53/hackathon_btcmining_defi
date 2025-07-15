import { ethers } from 'hardhat';
import { config } from 'dotenv';
import axios from 'axios';

config();

interface PoolBalance {
  poolId: string;
  btcBalance: number;
  pendingBTC: number;
  lastUpdate: Date;
}

interface CBBTCConversionResult {
  btcAmount: number;
  cbbtcAmount: number;
  transactionHash: string;
  gasUsed: number;
}

export class BTCToCBBTCService {
  private miningPoolContract: any;
  private cbbtcContract: any;
  private proofOfReserveContract: any;
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  
  // Mining pool APIs (examples - replace with actual APIs)
  private readonly LUXOR_API_URL = 'https://api.luxor.tech/v1';
  private readonly FOUNDRY_API_URL = 'https://api.foundrydigital.com/v1';
  
  // Exchange/Bridge APIs for BTC → cbBTC conversion
  private readonly COINBASE_API_URL = 'https://api.coinbase.com/v2';
  private readonly UNISWAP_API_URL = 'https://api.uniswap.org/v1';
  
  constructor() {
    this.provider = ethers.getDefaultProvider(process.env.BASE_RPC_URL);
    this.signer = new ethers.Wallet(process.env.PRIVATE_KEY!, this.provider);
  }

  async initialize() {
    // Initialize contract connections
    const MiningPool = await ethers.getContractFactory('MiningPool');
    const ProofOfReserve = await ethers.getContractFactory('ProofOfReserve');
    
    this.miningPoolContract = MiningPool.attach(process.env.MINING_POOL_ADDRESS!).connect(this.signer);
    this.proofOfReserveContract = ProofOfReserve.attach(process.env.PROOF_OF_RESERVE_ADDRESS!).connect(this.signer);
    
    // cbBTC is an external contract
    this.cbbtcContract = new ethers.Contract(
      process.env.CBBTC_TOKEN_ADDRESS!,
      ['function balanceOf(address) view returns (uint256)', 'function transfer(address, uint256) returns (bool)'],
      this.signer
    );
  }

  /**
   * Monitor mining pool BTC balances from various APIs
   */
  async monitorPoolBalances(): Promise<PoolBalance[]> {
    const poolBalances: PoolBalance[] = [];
    
    try {
      // Example: Luxor API integration
      const luxorBalance = await this.getLuxorPoolBalance();
      if (luxorBalance) {
        poolBalances.push(luxorBalance);
      }
      
      // Example: Foundry API integration
      const foundryBalance = await this.getFoundryPoolBalance();
      if (foundryBalance) {
        poolBalances.push(foundryBalance);
      }
      
      // Add more mining pools as needed
      
    } catch (error) {
      console.error('Error monitoring pool balances:', error);
    }
    
    return poolBalances;
  }

  /**
   * Get BTC balance from Luxor mining pool
   */
  private async getLuxorPoolBalance(): Promise<PoolBalance | null> {
    try {
      const response = await axios.get(`${this.LUXOR_API_URL}/accounts/balance`, {
        headers: {
          'Authorization': `Bearer ${process.env.LUXOR_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = response.data;
      return {
        poolId: 'luxor_btc_pool',
        btcBalance: data.confirmed_balance || 0,
        pendingBTC: data.pending_balance || 0,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error('Error fetching Luxor balance:', error);
      return null;
    }
  }

  /**
   * Get BTC balance from Foundry mining pool
   */
  private async getFoundryPoolBalance(): Promise<PoolBalance | null> {
    try {
      const response = await axios.get(`${this.FOUNDRY_API_URL}/accounts/balance`, {
        headers: {
          'Authorization': `Bearer ${process.env.FOUNDRY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = response.data;
      return {
        poolId: 'foundry_btc_pool',
        btcBalance: data.available_balance || 0,
        pendingBTC: data.unconfirmed_balance || 0,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error('Error fetching Foundry balance:', error);
      return null;
    }
  }

  /**
   * Convert BTC to cbBTC using Coinbase API
   */
  async convertBTCToCBBTC(btcAmount: number): Promise<CBBTCConversionResult | null> {
    try {
      // Step 1: Sell BTC for USD on Coinbase
      const usdAmount = await this.sellBTCForUSD(btcAmount);
      
      if (!usdAmount) {
        throw new Error('Failed to sell BTC for USD');
      }
      
      // Step 2: Buy cbBTC with USD
      const cbbtcAmount = await this.buyCBBTCWithUSD(usdAmount);
      
      if (!cbbtcAmount) {
        throw new Error('Failed to buy cbBTC with USD');
      }
      
      // Step 3: Transfer cbBTC to mining pool contract
      const txHash = await this.transferCBBTCToPool(cbbtcAmount);
      
      return {
        btcAmount,
        cbbtcAmount,
        transactionHash: txHash,
        gasUsed: 0 // Would be calculated from actual transaction
      };
      
    } catch (error) {
      console.error('Error converting BTC to cbBTC:', error);
      return null;
    }
  }

  /**
   * Sell BTC for USD on Coinbase
   */
  private async sellBTCForUSD(btcAmount: number): Promise<number | null> {
    try {
      const response = await axios.post(`${this.COINBASE_API_URL}/accounts/${process.env.COINBASE_BTC_ACCOUNT_ID}/transactions`, {
        type: 'sell',
        amount: btcAmount.toString(),
        currency: 'BTC',
        payment_method: process.env.COINBASE_PAYMENT_METHOD_ID
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.COINBASE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const transaction = response.data.data;
      return parseFloat(transaction.native_amount.amount);
      
    } catch (error) {
      console.error('Error selling BTC for USD:', error);
      return null;
    }
  }

  /**
   * Buy cbBTC with USD
   */
  private async buyCBBTCWithUSD(usdAmount: number): Promise<number | null> {
    try {
      const response = await axios.post(`${this.COINBASE_API_URL}/accounts/${process.env.COINBASE_USD_ACCOUNT_ID}/transactions`, {
        type: 'buy',
        amount: usdAmount.toString(),
        currency: 'USD',
        cryptocurrency: 'cbBTC'
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.COINBASE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      const transaction = response.data.data;
      return parseFloat(transaction.amount.amount);
      
    } catch (error) {
      console.error('Error buying cbBTC with USD:', error);
      return null;
    }
  }

  /**
   * Transfer cbBTC to mining pool contract
   */
  private async transferCBBTCToPool(cbbtcAmount: number): Promise<string> {
    try {
      const amountWei = ethers.parseUnits(cbbtcAmount.toString(), 8); // cbBTC has 8 decimals
      
      const tx = await this.miningPoolContract.fundCbBTCRewardPool(amountWei);
      await tx.wait();
      
      return tx.hash;
    } catch (error) {
      console.error('Error transferring cbBTC to pool:', error);
      throw error;
    }
  }

  /**
   * Update proof of reserve with latest BTC balances
   */
  async updateProofOfReserve(poolBalances: PoolBalance[]) {
    try {
      for (const balance of poolBalances) {
        // Convert BTC to satoshis
        const btcBalanceSatoshis = Math.floor(balance.btcBalance * 100000000);
        
        // Get current block height (would need BTC node connection)
        const blockHeight = await this.getCurrentBTCBlockHeight();
        
        // Update proof of reserve
        await this.proofOfReserveContract.updateReserveData(
          balance.poolId,
          btcBalanceSatoshis,
          216000000, // 216 TH/s in H/s (example)
          blockHeight
        );
        
        console.log(`Updated proof of reserve for ${balance.poolId}: ${balance.btcBalance} BTC`);
      }
    } catch (error) {
      console.error('Error updating proof of reserve:', error);
    }
  }

  /**
   * Get current Bitcoin block height
   */
  private async getCurrentBTCBlockHeight(): Promise<number> {
    try {
      const response = await axios.get('https://blockstream.info/api/blocks/tip/height');
      return response.data;
    } catch (error) {
      console.error('Error fetching BTC block height:', error);
      return 0;
    }
  }

  /**
   * Main automation loop
   */
  async startAutomationLoop() {
    console.log('Starting BTC → cbBTC automation service...');
    
    while (true) {
      try {
        console.log('Checking mining pool balances...');
        
        // 1. Monitor pool balances
        const poolBalances = await this.monitorPoolBalances();
        
        // 2. Update proof of reserve
        await this.updateProofOfReserve(poolBalances);
        
        // 3. Check if conversion is needed
        const totalBTC = poolBalances.reduce((sum, pool) => sum + pool.btcBalance, 0);
        const minimumConversionThreshold = 0.01; // 0.01 BTC
        
        if (totalBTC >= minimumConversionThreshold) {
          console.log(`Converting ${totalBTC} BTC to cbBTC...`);
          
          const result = await this.convertBTCToCBBTC(totalBTC);
          
          if (result) {
            console.log(`Successfully converted ${result.btcAmount} BTC to ${result.cbbtcAmount} cbBTC`);
            console.log(`Transaction hash: ${result.transactionHash}`);
          } else {
            console.error('Failed to convert BTC to cbBTC');
          }
        }
        
        // 4. Wait for next cycle (every 1 hour)
        console.log('Waiting for next cycle (1 hour)...');
        await new Promise(resolve => setTimeout(resolve, 3600000)); // 1 hour
        
      } catch (error) {
        console.error('Error in automation loop:', error);
        // Wait 5 minutes before retrying
        await new Promise(resolve => setTimeout(resolve, 300000));
      }
    }
  }

  /**
   * Emergency stop function
   */
  async emergencyStop() {
    console.log('Emergency stop triggered - halting automation service');
    process.exit(0);
  }

  /**
   * Get service status
   */
  async getServiceStatus() {
    try {
      const poolBalances = await this.monitorPoolBalances();
      const cbbtcBalance = await this.cbbtcContract.balanceOf(this.miningPoolContract.address);
      
      return {
        status: 'active',
        poolBalances,
        cbbtcRewardPoolBalance: ethers.formatUnits(cbbtcBalance, 8),
        lastUpdate: new Date()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        lastUpdate: new Date()
      };
    }
  }
}

// Export for use in other scripts
export default BTCToCBBTCService;

// CLI runner
if (require.main === module) {
  const service = new BTCToCBBTCService();
  
  async function main() {
    await service.initialize();
    
    const command = process.argv[2];
    
    switch (command) {
      case 'start':
        await service.startAutomationLoop();
        break;
      case 'status':
        const status = await service.getServiceStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
      case 'stop':
        await service.emergencyStop();
        break;
      default:
        console.log('Usage: npm run btc-service [start|status|stop]');
    }
  }
  
  main().catch(console.error);
}