import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

// Contract ABIs (simplified versions)
const MINING_POOL_ABI = [
  {
    "inputs": [{"name": "poolId", "type": "uint256"}, {"name": "amount", "type": "uint256"}],
    "name": "stake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "poolId", "type": "uint256"}, {"name": "amount", "type": "uint256"}],
    "name": "unstake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "poolId", "type": "uint256"}],
    "name": "claimRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "poolId", "type": "uint256"}, {"name": "user", "type": "address"}],
    "name": "getPendingRewards",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "poolId", "type": "uint256"}],
    "name": "getPoolInfo",
    "outputs": [
      {"name": "name", "type": "string"},
      {"name": "totalHashRate", "type": "uint256"},
      {"name": "totalStaked", "type": "uint256"},
      {"name": "rewardRate", "type": "uint256"},
      {"name": "active", "type": "bool"},
      {"name": "minimumStake", "type": "uint256"},
      {"name": "lockupPeriod", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "poolId", "type": "uint256"}, {"name": "user", "type": "address"}],
    "name": "getUserInfo",
    "outputs": [
      {"name": "amount", "type": "uint256"},
      {"name": "rewardDebt", "type": "uint256"},
      {"name": "stakeTime", "type": "uint256"},
      {"name": "lastClaimTime", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const CBBTC_MINING_TOKEN_ABI = [
  {
    "inputs": [{"name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getRewards",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const CHAINLINK_ORACLE_ABI = [
  {
    "inputs": [],
    "name": "getBTCPrice",
    "outputs": [{"name": "price", "type": "int256"}, {"name": "timestamp", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBTCPriceInWei",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "hashRate", "type": "uint256"}, {"name": "duration", "type": "uint256"}],
    "name": "calculateMiningReward",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const AAVE_INTEGRATION_ABI = [
  {
    "inputs": [{"name": "amount", "type": "uint256"}],
    "name": "depositToAave",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "amount", "type": "uint256"}],
    "name": "withdrawFromAave",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimYield",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getYieldBalance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "getUserDepositInfo",
    "outputs": [
      {"name": "amount", "type": "uint256"},
      {"name": "depositTime", "type": "uint256"},
      {"name": "lastYieldClaim", "type": "uint256"},
      {"name": "accumulatedYield", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalStats",
    "outputs": [
      {"name": "totalDeposited", "type": "uint256"},
      {"name": "totalYieldGenerated", "type": "uint256"},
      {"name": "currentATokenBalance", "type": "uint256"},
      {"name": "estimatedAPY", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const ERC20_ABI = [
  {
    "inputs": [{"name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export interface ContractAddresses {
  miningPool: string;
  miningToken: string;
  chainlinkOracle: string;
  aaveIntegration: string;
  cbBTC: string;
}

export class Web3Service {
  private web3: Web3;
  private contracts: {
    miningPool: Contract<typeof MINING_POOL_ABI>;
    miningToken: Contract<typeof CBBTC_MINING_TOKEN_ABI>;
    chainlinkOracle: Contract<typeof CHAINLINK_ORACLE_ABI>;
    aaveIntegration: Contract<typeof AAVE_INTEGRATION_ABI>;
    cbBTC: Contract<typeof ERC20_ABI>;
  };

  constructor(provider: any, contractAddresses: ContractAddresses) {
    this.web3 = new Web3(provider);
    
    this.contracts = {
      miningPool: new this.web3.eth.Contract(MINING_POOL_ABI, contractAddresses.miningPool),
      miningToken: new this.web3.eth.Contract(CBBTC_MINING_TOKEN_ABI, contractAddresses.miningToken),
      chainlinkOracle: new this.web3.eth.Contract(CHAINLINK_ORACLE_ABI, contractAddresses.chainlinkOracle),
      aaveIntegration: new this.web3.eth.Contract(AAVE_INTEGRATION_ABI, contractAddresses.aaveIntegration),
      cbBTC: new this.web3.eth.Contract(ERC20_ABI, contractAddresses.cbBTC)
    };
  }

  // Utility methods
  async getAccount(): Promise<string> {
    const accounts = await this.web3.eth.getAccounts();
    return accounts[0];
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.web3.eth.getBalance(address);
    return this.web3.utils.fromWei(balance, 'ether');
  }

  // Mining Pool methods
  async stakeToPool(poolId: number, amount: string): Promise<string> {
    const account = await this.getAccount();
    const amountWei = this.web3.utils.toWei(amount, 'ether');
    
    // First approve cbBTC spending
    await this.contracts.cbBTC.methods.approve(
      this.contracts.miningPool.options.address,
      amountWei
    ).send({ from: account });
    
    // Then stake
    return await this.contracts.miningPool.methods.stake(poolId, amountWei).send({ from: account });
  }

  async unstakeFromPool(poolId: number, amount: string): Promise<string> {
    const account = await this.getAccount();
    const amountWei = this.web3.utils.toWei(amount, 'ether');
    
    return await this.contracts.miningPool.methods.unstake(poolId, amountWei).send({ from: account });
  }

  async claimMiningRewards(poolId: number): Promise<string> {
    const account = await this.getAccount();
    return await this.contracts.miningPool.methods.claimRewards(poolId).send({ from: account });
  }

  async getPendingRewards(poolId: number, userAddress?: string): Promise<string> {
    const address = userAddress || await this.getAccount();
    const rewards = await this.contracts.miningPool.methods.getPendingRewards(poolId, address).call();
    return this.web3.utils.fromWei(rewards, 'ether');
  }

  async getPoolInfo(poolId: number) {
    const info = await this.contracts.miningPool.methods.getPoolInfo(poolId).call();
    return {
      name: info.name,
      totalHashRate: info.totalHashRate,
      totalStaked: this.web3.utils.fromWei(info.totalStaked, 'ether'),
      rewardRate: this.web3.utils.fromWei(info.rewardRate, 'ether'),
      active: info.active,
      minimumStake: this.web3.utils.fromWei(info.minimumStake, 'ether'),
      lockupPeriod: info.lockupPeriod
    };
  }

  async getUserInfo(poolId: number, userAddress?: string) {
    const address = userAddress || await this.getAccount();
    const info = await this.contracts.miningPool.methods.getUserInfo(poolId, address).call();
    return {
      amount: this.web3.utils.fromWei(info.amount, 'ether'),
      rewardDebt: this.web3.utils.fromWei(info.rewardDebt, 'ether'),
      stakeTime: info.stakeTime,
      lastClaimTime: info.lastClaimTime
    };
  }

  // Token methods
  async getMiningTokenBalance(userAddress?: string): Promise<string> {
    const address = userAddress || await this.getAccount();
    const balance = await this.contracts.miningToken.methods.balanceOf(address).call();
    return this.web3.utils.fromWei(balance, 'ether');
  }

  async getCbBTCBalance(userAddress?: string): Promise<string> {
    const address = userAddress || await this.getAccount();
    const balance = await this.contracts.cbBTC.methods.balanceOf(address).call();
    return this.web3.utils.fromWei(balance, 'ether');
  }

  async getUnclaimedRewards(userAddress?: string): Promise<string> {
    const address = userAddress || await this.getAccount();
    const rewards = await this.contracts.miningToken.methods.getRewards(address).call();
    return this.web3.utils.fromWei(rewards, 'ether');
  }

  async claimTokenRewards(): Promise<string> {
    const account = await this.getAccount();
    return await this.contracts.miningToken.methods.claimRewards().send({ from: account });
  }

  // Oracle methods
  async getBTCPrice(): Promise<{ price: string; timestamp: number }> {
    const result = await this.contracts.chainlinkOracle.methods.getBTCPrice().call();
    return {
      price: (parseInt(result.price) / 100000000).toString(), // Convert from 8 decimals to readable format
      timestamp: parseInt(result.timestamp)
    };
  }

  async getBTCPriceInWei(): Promise<string> {
    const price = await this.contracts.chainlinkOracle.methods.getBTCPriceInWei().call();
    return this.web3.utils.fromWei(price, 'ether');
  }

  async calculateMiningReward(hashRate: string, duration: number): Promise<string> {
    const hashRateWei = this.web3.utils.toWei(hashRate, 'ether');
    const reward = await this.contracts.chainlinkOracle.methods.calculateMiningReward(hashRateWei, duration).call();
    return this.web3.utils.fromWei(reward, 'ether');
  }

  // Aave methods
  async depositToAave(amount: string): Promise<string> {
    const account = await this.getAccount();
    const amountWei = this.web3.utils.toWei(amount, 'ether');
    
    // First approve cbBTC spending
    await this.contracts.cbBTC.methods.approve(
      this.contracts.aaveIntegration.options.address,
      amountWei
    ).send({ from: account });
    
    // Then deposit
    return await this.contracts.aaveIntegration.methods.depositToAave(amountWei).send({ from: account });
  }

  async withdrawFromAave(amount: string): Promise<string> {
    const account = await this.getAccount();
    const amountWei = this.web3.utils.toWei(amount, 'ether');
    
    return await this.contracts.aaveIntegration.methods.withdrawFromAave(amountWei).send({ from: account });
  }

  async claimAaveYield(): Promise<string> {
    const account = await this.getAccount();
    return await this.contracts.aaveIntegration.methods.claimYield().send({ from: account });
  }

  async getYieldBalance(userAddress?: string): Promise<string> {
    const address = userAddress || await this.getAccount();
    const balance = await this.contracts.aaveIntegration.methods.getYieldBalance(address).call();
    return this.web3.utils.fromWei(balance, 'ether');
  }

  async getUserDepositInfo(userAddress?: string) {
    const address = userAddress || await this.getAccount();
    const info = await this.contracts.aaveIntegration.methods.getUserDepositInfo(address).call();
    return {
      amount: this.web3.utils.fromWei(info.amount, 'ether'),
      depositTime: info.depositTime,
      lastYieldClaim: info.lastYieldClaim,
      accumulatedYield: this.web3.utils.fromWei(info.accumulatedYield, 'ether')
    };
  }

  async getAaveTotalStats() {
    const stats = await this.contracts.aaveIntegration.methods.getTotalStats().call();
    return {
      totalDeposited: this.web3.utils.fromWei(stats.totalDeposited, 'ether'),
      totalYieldGenerated: this.web3.utils.fromWei(stats.totalYieldGenerated, 'ether'),
      currentATokenBalance: this.web3.utils.fromWei(stats.currentATokenBalance, 'ether'),
      estimatedAPY: (parseInt(stats.estimatedAPY) / 100).toString() // Convert to percentage
    };
  }

  // Utility methods
  toWei(amount: string): string {
    return this.web3.utils.toWei(amount, 'ether');
  }

  fromWei(amount: string): string {
    return this.web3.utils.fromWei(amount, 'ether');
  }

  isValidAddress(address: string): boolean {
    return this.web3.utils.isAddress(address);
  }
}