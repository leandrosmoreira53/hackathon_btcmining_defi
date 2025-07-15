# ⚡ MinerFi: ASIC S21+ Tokenization DApp

**Project Name:** MinerFi

**Core Idea:** Tokenize real-world Bitcoin mining operations (RWA - Real World Asset), allowing investors to acquire tokenized computing power (TH/s) and receive Bitcoin yield directly into their wallets via blockchain. The mined yield is converted into cbBTC (Bitcoin tokenized on the Base network) and automatically distributed. The token can also be used as collateral in DeFi protocols.

**Real Problem Solved:** Democratizes access to Bitcoin mining, currently restricted to large players due to high infrastructure, energy, and equipment costs. Reduces entry barriers for small investors and allows the mined yield to be used as DeFi collateral, increasing the liquidity and usability of mined Bitcoin.

---

## 🚀 User Journey in MinerFi

### 1️⃣ Purchase Mining Power (TH/s)
- The user accesses the MinerFi website.
- Buys an NFT representing 18 TH/s (for example).
- This NFT guarantees participation in a real operational mining machine.

### 2️⃣ Mining Starts
- The physical machine mines Bitcoin as normal.
- The mining rewards are automatically converted into cbBTC (Bitcoin tokenized on the Base network).

### 3️⃣ Daily Rewards
- Every day, the user receives cbBTC directly into their wallet.
- The amount depends on the TH/s purchased.

### 4️⃣ User Options During the Operation
- The user can:
  - Withdraw their cbBTC.
  - Use it as collateral in DeFi (e.g., borrow USDC in Aave).
  - Automatically reinvest rewards to buy more TH/s (optional).
  - Track everything via the dashboard.

### 5️⃣ 3-Year Mining Cycle
- Mining continues.
- The user receives daily rewards.
- The NFT (TH/s) can be resold or transferred at any time.

### 6️⃣ End of Cycle (3 Years)
- The machine reaches the end of its useful life.
- The NFT loses its function.
- The user returns (burns) their NFT.
- Receives the resale value of the machine paid in cbBTC as a final payout.

### 7️⃣ Closure
- Contract ends.
- The user receives 3 years of rewards + the machine’s resale value.
- If desired, the user can buy new TH/s to start a new cycle.

**✅ Summary:**
Buy NFT ➔ Earn Bitcoin daily ➔ Optional DeFi usage ➔ Final payout after 3 years.

---

An innovative mini-app built on the **Base Network** that tokenizes a **real Antminer S21+ mining machine**, allowing you to buy fractions of **20 TH/s** with a **daily ROI of $1 USD** per fraction.

## 🪙 Token Type and Function

### Token Type:
- **NFT (ERC-721)**: represents fixed hashrate lots (e.g., 18 TH/s).
- **Utility Token (ERC-20)**: optional for smaller fractions (under development).

### Token Function:
- Represents the right to receive real mining yield.
- Grants access to periodic rewards in cbBTC.
- Serves as proof of participation in the mining infrastructure.

### Investor Benefits:
- Daily/weekly yield distribution in cbBTC (real yield).
- Possibility to use the yield as collateral in DeFi protocols like Aave.
- Easy access to the mining market.

## 💲 Tokenomics Model

### Total Supply:
- 1,000 NFTs initially (each NFT = 18 TH/s).
- Supply expandable as infrastructure scales.

### Initial Distribution:
- **60%** – Public Sale (buyers).
- **20%** – Treasury (for expansion and maintenance).
- **10%** – Founders and Team (24-month vesting).
- **10%** – Liquidity Pool (for secondary market).

### Staking: 
Not applicable (the token itself generates yield via mining).

### Burning: 
At the end of the ASIC's lifecycle (3 years), the token loses its function.
Users return (burn) the NFT TH/s and receive the machine's residual value (converted and minted as cbBTC). Burn of the token + final payout redemption.

### Inflation: 
No token inflation. New lots are only created when new machines are acquired.

## 🎯 Incentives and Governance

### How to Encourage Holding:
- Daily cbBTC yield attached to the token.
- DeFi integration for collateral use (Aave).
- Possibility of post-borrow reinvestment (recommended health factor: 2.00).

### Governance:
- DAO planned for future expansion (MinerFi DAO).
- Proposals: votes on infrastructure expansion, treasury use, distribution adjustments.

## ⚖️ Risks and Regulation

### Is the Token a Security?
Potentially yes, depending on jurisdiction (Howey Test).
Generates passive yield, which may attract security token regulations.

### Measures to Avoid Legal Risks:
- Positioning as a tokenized RWA (Real World Asset).
- Yield backed by real-world mining operations.
- Use of audited smart contracts.
- Optional registration as an asset tokenization company (based on jurisdiction).
- Geographical restrictions (optional KYC).

## 🌟 Main Features

### ⚡ Real ASIC Tokenization
- **Antminer S21+**: Real machine with 216 TH/s total hashrate
- **20 TH/s Fractions**: Each token represents 18 TH/s (~9.26% of the machine)
- **Daily ROI**: $1 USD per 18 TH/s fraction per day
- **Full Transparency**: Fractional ownership verifiable on-chain

### 🏦 DeFi Integration with Aave
- **Automatic Yield**: cbBTC automatically deposited in Aave V3
- **Compound Yield**: Mining + DeFi yield from Aave
- **Flexible Liquidity**: Withdraw/deposit at any time

### 🔗 Base Network Integration
- **Coinbase Wallet**: Exclusive native integration
- **Low Fees**: Transactions < $0.01 on Base Network
- **Chainlink Oracles**: Real-time BTC price data

## 🛠️ Tech Stack

### Blockchain
- **Base Network** (Ethereum L2)
- **Solidity 0.8.19** for smart contracts
- **Hardhat** for development and deployment
- **OpenZeppelin** for security standards

### Web3 Integrations
- **cbBTC Token** (Coinbase Wrapped Bitcoin)
- **Chainlink Oracles** for prices and data
- **Aave V3 Protocol** for yield farming
- **Coinbase Wallet SDK** for connectivity

### Frontend
- **React 18** with TypeScript
- **Web3.js** for blockchain interaction
- **Coinbase Wallet SDK** exclusive integration
- **CSS-in-JS** for styling

## 📁 Project Structure

```
mining-cbbtc-dapp/
├── contracts/                     # Smart Contracts
│   ├── MiningPool.sol             # Main mining pool
│   ├── cbBTCMiningToken.sol       # ERC-20 mining token
│   ├── ChainlinkOracle.sol        # Chainlink integration
│   ├── AaveIntegration.sol        # Aave V3 integration
│   └── interfaces/                # Contract interfaces
├── frontend/                      # React application
│   └── src/
│       ├── components/            # React components
│       ├── hooks/                 # Custom React Hooks
│       ├── services/              # Web3 services
│       └── utils/                 # Utilities
├── scripts/                       # Deployment scripts
└── test/                         # Automated tests
```

## 🚀 Setup and Deployment

### Prerequisites
- Node.js 18+
- npm or yarn
- Wallet with ETH on Base Network
- API keys (Basescan, Alchemy/Infura)

### 1. Installation
```bash
# Clone the repository
git clone <repository-url>
cd mining-cbbtc-dapp

# Install dependencies
npm install
cd frontend && npm install
```

### 2. Configuration
```bash
# Copy environment file
cp .env.example .env

# Configure variables:
# PRIVATE_KEY=your_private_key
# BASESCAN_API_KEY=your_api_key
# CHAINLINK_BTC_USD_FEED=0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69
# AAVE_V3_POOL_ADDRESS=0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
# CBBTC_TOKEN_ADDRESS=0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf
```

### 3. Contract Deployment
```bash
# Compile contracts
npx hardhat compile

# Deploy to Base Sepolia (testnet)
npx hardhat run scripts/deploy.ts --network base_sepolia

# Deploy to Base Mainnet
npx hardhat run scripts/deploy.ts --network base
```

### 4. Frontend Configuration
```bash
# Update contract addresses in the frontend
# Edit frontend/src/hooks/useWeb3.ts with deployed addresses
```

## 💡 How to Use

### 1. Connect Wallet
- Open the application
- Click "Connect Coinbase Wallet"
- Confirm connection and switch to Base Network

### 2. Stake cbBTC
- Enter amount of cbBTC to stake
- Approve allowance transaction
- Confirm stake transaction
- Receive mining tokens proportionally

### 3. Automatic Yield Farming
- cbBTC automatically deposited in Aave
- Additional yield generated via Aave
- Real-time yield visualization

### 4. Claim Rewards
- Check pending rewards
- Claim mining tokens
- Claim Aave yield

## 🔧 Useful Commands

```bash
# Development
npx hardhat compile                # Compile contracts
npx hardhat test                  # Run tests
npx hardhat node                  # Local node
npx hardhat console --network base # Base Network console

# Frontend
cd frontend
npm start                         # Development
npm run build                    # Production build
npm run lint                     # Linting
```

## 📊 Business Model - Real Parameters

### 💰 Initial Investment
- **Minimum Entry**: 18 TH = US$700 (US$35/TH)
- **Equipment**: Bitmain Antminer S21+ (216 TH total)
- **Location**: Paraguay (cheap energy)
- **Operational Markup**: 5%

### 📈 Return on Investment
- **Daily Profit**: US$1.50/day per 18 TH package
- **Profit per TH**: US$0.075/TH/day
- **Annual ROI**: 77%
- **Breakeven**: 15.5 months (without DeFi)
- **Breakeven with DeFi**: 13.6 months

### 🏦 DeFi Integration
- **Additional Yield**: +US$0.50/day via Aave/Aerodrome
- **Reinvestment**: Automatic in more TH
- **Growth**: +0.429 TH/month via DeFi
- **Collateral**: Tokenized cbBTC

### ⚡ Technical Specs
- **Model**: Bitmain Antminer S21+
- **Hashrate**: 216 TH/s total
- **Consumption**: 3,510W
- **Energy Cost**: US$0.07/kWh
- **Algorithm**: SHA-256

## 🌐 Contract Addresses (Base Network)

### External Contracts
- **cbBTC Token**: `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf`
- **Chainlink BTC/USD**: `0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69`
- **Aave V3 Pool**: `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`

*Deployed contract addresses will be updated after deployment*

## 🔒 Security

### Implemented Practices
- **OpenZeppelin**: Audited contracts and security standards
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Pausable**: Emergency pause capability
- **Access Control**: Granular permissions
- **Chainlink**: Reliable decentralized oracles

### Audits
- Contracts based on OpenZeppelin standards
- Integration with battle-tested protocols (Aave, Chainlink)
- Automated tests for critical functions

## 📈 Metrics and Analytics

### Real-Time Dashboard
- BTC price via Chainlink
- Total Value Locked (TVL)
- Accumulated mining rewards
- Aave yield generated
- Pool hashrate and performance

### Transparency
- All on-chain transactions
- Auditable reward history
- Public performance metrics

## 🎯 Future Roadmap

### Phase 2 - Expansion
- [ ] Multiple mining pools
- [ ] Integration with more DeFi protocols
- [ ] Governance token
- [ ] Advanced analytics dashboard

### Phase 3 - Optimization
- [ ] Layer 2 gas optimizations
- [ ] Flash loans integration
- [ ] Cross-chain bridges
- [ ] Mobile app

## 🤝 Contribution

### For Developers
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

### Reporting Bugs
- Open an issue detailing the problem
- Include steps to reproduce
- Add screenshots if relevant
- Specify environment (browser, network, etc.)

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🏆 Hackathon Submission
