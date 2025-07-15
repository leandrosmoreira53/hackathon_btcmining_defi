# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **cbBTC Mining Tokenization DApp** built on Base Network that tokenizes Bitcoin mining operations using cbBTC (Coinbase Wrapped Bitcoin) and integrates with Aave V3 for automated DeFi yield farming.

## Architecture

### Smart Contracts (Solidity)
- **MiningPool.sol**: Main contract managing tokenized mining pools with staking/unstaking
- **cbBTCMiningToken.sol**: ERC-20 token for mining rewards with minting controls
- **ChainlinkOracle.sol**: Real-time BTC price feeds and mining reward calculations
- **AaveIntegration.sol**: Automated cbBTC deposits to Aave V3 for yield farming

### Frontend (React + TypeScript)
- **CoinbaseWalletConnector**: Exclusive integration with Coinbase Wallet
- **MiningDashboard**: Real-time mining metrics and staking interface
- **Web3Service**: Complete blockchain interaction layer
- **Custom Hooks**: React hooks for wallet and Web3 management

## Development Commands

### Smart Contracts
```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Base Sepolia testnet
npx hardhat run scripts/deploy.ts --network base_sepolia

# Deploy to Base mainnet
npx hardhat run scripts/deploy.ts --network base

# Verify contracts on Basescan
npx hardhat verify --network base <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Frontend Development
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Type checking
npx tsc --noEmit
```

## Key Technologies

### Blockchain Integration
- **Base Network**: Ethereum L2 with low fees (<$0.01 per transaction)
- **cbBTC**: Official Coinbase Wrapped Bitcoin (1:1 BTC backing)
- **Chainlink**: Decentralized oracles for BTC price feeds
- **Aave V3**: DeFi protocol for automated yield farming
- **Coinbase Wallet SDK**: Native wallet integration

### Contract Addresses (Base Network)
- **cbBTC Token**: `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf`
- **Chainlink BTC/USD Feed**: `0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69`
- **Aave V3 Pool**: `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`

## Environment Configuration

### Required Environment Variables
```bash
# Deployment
PRIVATE_KEY=your_private_key_without_0x
BASESCAN_API_KEY=your_basescan_api_key

# Contract Addresses
CHAINLINK_BTC_USD_FEED=0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69
AAVE_V3_POOL_ADDRESS=0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
CBBTC_TOKEN_ADDRESS=0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf

# Frontend
REACT_APP_MINING_POOL_ADDRESS=deployed_mining_pool_address
REACT_APP_MINING_TOKEN_ADDRESS=deployed_mining_token_address
REACT_APP_CHAINLINK_ORACLE_ADDRESS=deployed_oracle_address
REACT_APP_AAVE_INTEGRATION_ADDRESS=deployed_aave_integration_address
REACT_APP_CBBTC_TOKEN_ADDRESS=0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf
```

## Code Patterns

### Smart Contract Development
- Use OpenZeppelin patterns for security (ReentrancyGuard, Ownable, Pausable)
- Implement proper access controls with role-based permissions
- Use SafeERC20 for token transfers
- Include comprehensive events for off-chain tracking
- Follow Checks-Effects-Interactions pattern

### Frontend Development
- Use TypeScript for type safety
- Implement custom hooks for Web3 interactions
- Handle wallet connection states properly
- Include proper error handling and user feedback
- Use CSS-in-JS for component styling
- Implement real-time data fetching with automatic refresh

### Web3 Integration
- Initialize Web3Service only after wallet connection
- Handle network switching to Base automatically
- Implement proper transaction state management
- Use appropriate gas estimation for Base network
- Include transaction receipts and error handling

## Testing Strategy

### Contract Testing
```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/MiningPool.test.ts

# Generate coverage report
npx hardhat coverage
```

### Frontend Testing
- Test wallet connection flows
- Test contract interaction methods
- Test UI state management
- Test error handling scenarios

## Deployment Process

1. **Compile and Test Contracts**
   ```bash
   npx hardhat compile
   npx hardhat test
   ```

2. **Deploy to Base Sepolia (Testnet)**
   ```bash
   npx hardhat run scripts/deploy.ts --network base_sepolia
   ```

3. **Update Frontend Configuration**
   - Update contract addresses in environment variables
   - Update frontend/src/hooks/useWeb3.ts with deployed addresses

4. **Deploy to Base Mainnet**
   ```bash
   npx hardhat run scripts/deploy.ts --network base
   ```

5. **Verify Contracts**
   ```bash
   npx hardhat verify --network base <CONTRACT_ADDRESS>
   ```

## Security Considerations

- All contracts inherit from OpenZeppelin security patterns
- ReentrancyGuard prevents reentrancy attacks
- Pausable functionality for emergency stops
- Role-based access control for administrative functions
- Chainlink oracles prevent price manipulation
- Aave integration uses battle-tested DeFi protocols

## Troubleshooting

### Common Issues
- **Wallet Connection**: Ensure user is on Base network (chainId 8453 or 84532)
- **Transaction Failures**: Check gas estimation and network congestion
- **Contract Interactions**: Verify contract addresses and ABIs are correct
- **Oracle Data**: Ensure Chainlink feeds are active and not stale

### Base Network Specifics
- Use Base RPC: `https://mainnet.base.org`
- Base Sepolia RPC: `https://sepolia.base.org`
- Gas estimation typically very low (<0.001 ETH)
- Block confirmation times ~2 seconds

## Project Structure Notes

- `/contracts`: All smart contracts and interfaces
- `/scripts`: Deployment and setup scripts
- `/test`: Contract tests (to be implemented)
- `/frontend/src/services`: Web3 and wallet services
- `/frontend/src/components`: React components
- `/frontend/src/hooks`: Custom React hooks

This codebase focuses on Base Network integration with Coinbase Wallet, cbBTC tokenization, and automated DeFi yield farming through Aave V3.