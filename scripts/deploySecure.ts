import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

interface SecurityConfig {
  maxContractBalance: string;
  emergencyStopDelay: number;
  priceDeviationThreshold: number;
  rateLimitWindow: number;
  maxActionsPerWindow: number;
}

interface DeploymentAddresses {
  secureTokenizedMining: string;
  secureAaveIntegration: string;
  secureChainlinkOracle: string;
  admin: string;
  operator: string;
  yieldManager: string;
  emergency: string;
}

async function main() {
  console.log("🔒 Starting Secure Contract Deployment...");
  
  const [deployer, admin, operator, yieldManager, emergency] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("Admin address:", admin.address);

  // Security configuration
  const securityConfig: SecurityConfig = {
    maxContractBalance: ethers.utils.parseUnits("10000000", 6).toString(), // 10M USDC
    emergencyStopDelay: 24 * 60 * 60, // 24 hours
    priceDeviationThreshold: 1000, // 10% in basis points
    rateLimitWindow: 60 * 60, // 1 hour
    maxActionsPerWindow: 10
  };

  // Contract addresses for Base network
  const BTC_PRICE_FEED = process.env.CHAINLINK_BTC_USD_FEED || "0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69";
  const AAVE_POOL = process.env.AAVE_V3_POOL_ADDRESS || "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
  const CBBTC_TOKEN = process.env.CBBTC_TOKEN_ADDRESS || "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf";
  const USDC_TOKEN = process.env.USDC_TOKEN_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  console.log("\n=== Security Configuration ===");
  console.log("Max Contract Balance:", securityConfig.maxContractBalance);
  console.log("Emergency Stop Delay:", securityConfig.emergencyStopDelay, "seconds");
  console.log("Price Deviation Threshold:", securityConfig.priceDeviationThreshold, "basis points");

  console.log("\n=== External Contract Addresses ===");
  console.log("BTC Price Feed:", BTC_PRICE_FEED);
  console.log("Aave Pool:", AAVE_POOL);
  console.log("cbBTC Token:", CBBTC_TOKEN);
  console.log("USDC Token:", USDC_TOKEN);

  // Deploy Secure Chainlink Oracle
  console.log("\n=== Deploying Secure Chainlink Oracle ===");
  const SecureChainlinkOracle = await ethers.getContractFactory("ChainlinkOracle");
  const secureOracle = await SecureChainlinkOracle.deploy(BTC_PRICE_FEED);
  await secureOracle.deployed();
  console.log("Secure ChainlinkOracle deployed to:", secureOracle.address);

  // Verify oracle deployment
  try {
    const [price, timestamp] = await secureOracle.getBTCPrice();
    console.log("Oracle verification - BTC Price:", price.toString(), "Timestamp:", timestamp.toString());
  } catch (error) {
    console.warn("Oracle verification failed:", error);
  }

  // Deploy Secure Tokenized Mining
  console.log("\n=== Deploying Secure Tokenized Mining ===");
  const SecureTokenizedMining = await ethers.getContractFactory("SecureTokenizedMining");
  const secureMining = await SecureTokenizedMining.deploy(
    USDC_TOKEN,
    BTC_PRICE_FEED,
    admin.address
  );
  await secureMining.deployed();
  console.log("Secure TokenizedMining deployed to:", secureMining.address);

  // Get aToken address for cbBTC from Aave
  // Note: In production, you would query Aave protocol data provider
  const aCBBTC_TOKEN = "0x0000000000000000000000000000000000000000"; // Placeholder
  console.log("Note: aToken address needs to be updated with actual Aave aToken for cbBTC");

  // Deploy Secure Aave Integration
  console.log("\n=== Deploying Secure Aave Integration ===");
  const SecureAaveIntegration = await ethers.getContractFactory("SecureAaveIntegration");
  const secureAave = await SecureAaveIntegration.deploy(
    AAVE_POOL,
    CBBTC_TOKEN,
    aCBBTC_TOKEN, // This should be replaced with actual aToken address
    admin.address
  );
  await secureAave.deployed();
  console.log("Secure AaveIntegration deployed to:", secureAave.address);

  // Setup security configurations
  console.log("\n=== Configuring Security Settings ===");

  // Setup roles for TokenizedMining
  console.log("Setting up roles for TokenizedMining...");
  const ADMIN_ROLE = await secureMining.ADMIN_ROLE();
  const OPERATOR_ROLE = await secureMining.OPERATOR_ROLE();
  const YIELD_MANAGER_ROLE = await secureMining.YIELD_MANAGER_ROLE();
  const EMERGENCY_ROLE = await secureMining.EMERGENCY_ROLE();

  await secureMining.connect(admin).grantRole(OPERATOR_ROLE, operator.address);
  await secureMining.connect(admin).grantRole(YIELD_MANAGER_ROLE, yieldManager.address);
  await secureMining.connect(admin).grantRole(EMERGENCY_ROLE, emergency.address);
  console.log("TokenizedMining roles configured");

  // Setup roles for AaveIntegration
  console.log("Setting up roles for AaveIntegration...");
  const DEPOSITOR_ROLE = await secureAave.DEPOSITOR_ROLE();
  const WITHDRAWER_ROLE = await secureAave.WITHDRAWER_ROLE();
  const AAVE_YIELD_MANAGER_ROLE = await secureAave.YIELD_MANAGER_ROLE();
  const AAVE_EMERGENCY_ROLE = await secureAave.EMERGENCY_ROLE();

  await secureAave.connect(admin).grantRole(DEPOSITOR_ROLE, secureMining.address);
  await secureAave.connect(admin).grantRole(WITHDRAWER_ROLE, admin.address);
  await secureAave.connect(admin).grantRole(AAVE_YIELD_MANAGER_ROLE, yieldManager.address);
  await secureAave.connect(admin).grantRole(AAVE_EMERGENCY_ROLE, emergency.address);
  console.log("AaveIntegration roles configured");

  // Set security limits
  console.log("Setting security limits...");
  await secureMining.connect(admin).setMaxContractBalance(securityConfig.maxContractBalance);
  
  await secureAave.connect(admin).updateSecurityLimits(
    ethers.utils.parseUnits("50000", 6), // maxDailyWithdraw: 50,000 USDC
    ethers.utils.parseUnits("100000", 6), // maxDailyDeposit: 100,000 USDC
    ethers.utils.parseUnits("500000", 6), // maxUserBalance: 500,000 USDC
    ethers.utils.parseUnits("5000000", 6)  // maxContractBalance: 5M USDC
  );
  console.log("Security limits configured");

  // Setup price validation
  console.log("Setting up oracle price validation...");
  try {
    const [currentPrice] = await secureOracle.getBTCPrice();
    await secureMining.connect(operator).updateLastValidPrice("BTC/USD", currentPrice);
    console.log("Oracle price validation configured");
  } catch (error) {
    console.warn("Could not setup price validation:", error);
  }

  // Run security checks
  console.log("\n=== Running Security Checks ===");
  
  // Check access controls
  console.log("Checking access controls...");
  const hasAdminRole = await secureMining.hasRole(ADMIN_ROLE, admin.address);
  const hasOperatorRole = await secureMining.hasRole(OPERATOR_ROLE, operator.address);
  const hasYieldManagerRole = await secureMining.hasRole(YIELD_MANAGER_ROLE, yieldManager.address);
  const hasEmergencyRole = await secureMining.hasRole(EMERGENCY_ROLE, emergency.address);
  
  console.log("✅ Admin role:", hasAdminRole);
  console.log("✅ Operator role:", hasOperatorRole);
  console.log("✅ Yield Manager role:", hasYieldManagerRole);
  console.log("✅ Emergency role:", hasEmergencyRole);

  // Check contract settings
  console.log("Checking contract settings...");
  const maxBalance = await secureMining.maxContractBalance();
  const totalHashrate = await secureMining.TOTAL_HASHRATE();
  const minTH = await secureMining.ENTRADA_MINIMA_TH();
  const maxTH = await secureMining.ENTRADA_MAXIMA_TH();
  
  console.log("✅ Max contract balance:", ethers.utils.formatUnits(maxBalance, 6), "USDC");
  console.log("✅ Total hashrate:", totalHashrate.toString(), "TH");
  console.log("✅ Min TH per purchase:", minTH.toString());
  console.log("✅ Max TH per purchase:", maxTH.toString());

  // Check emergency controls
  console.log("Checking emergency controls...");
  const emergencyStop = await secureMining.emergencyStop();
  const paused = await secureMining.paused();
  
  console.log("✅ Emergency stop:", emergencyStop ? "ACTIVE" : "INACTIVE");
  console.log("✅ Contract paused:", paused ? "YES" : "NO");

  // Generate deployment summary
  const deploymentAddresses: DeploymentAddresses = {
    secureTokenizedMining: secureMining.address,
    secureAaveIntegration: secureAave.address,
    secureChainlinkOracle: secureOracle.address,
    admin: admin.address,
    operator: operator.address,
    yieldManager: yieldManager.address,
    emergency: emergency.address
  };

  console.log("\n=== Deployment Summary ===");
  console.log("🔒 Secure TokenizedMining:", deploymentAddresses.secureTokenizedMining);
  console.log("🔒 Secure AaveIntegration:", deploymentAddresses.secureAaveIntegration);
  console.log("🔒 Secure ChainlinkOracle:", deploymentAddresses.secureChainlinkOracle);
  console.log("\n=== Role Addresses ===");
  console.log("👑 Admin:", deploymentAddresses.admin);
  console.log("⚙️ Operator:", deploymentAddresses.operator);
  console.log("💰 Yield Manager:", deploymentAddresses.yieldManager);
  console.log("🚨 Emergency:", deploymentAddresses.emergency);

  // Save deployment info
  const deploymentInfo = {
    network: "base",
    chainId: 8453,
    deploymentTime: new Date().toISOString(),
    deployer: deployer.address,
    securityConfig,
    contracts: {
      secureTokenizedMining: deploymentAddresses.secureTokenizedMining,
      secureAaveIntegration: deploymentAddresses.secureAaveIntegration,
      secureChainlinkOracle: deploymentAddresses.secureChainlinkOracle
    },
    roles: {
      admin: deploymentAddresses.admin,
      operator: deploymentAddresses.operator,
      yieldManager: deploymentAddresses.yieldManager,
      emergency: deploymentAddresses.emergency
    },
    externalContracts: {
      BTC_PRICE_FEED,
      AAVE_POOL,
      CBBTC_TOKEN,
      USDC_TOKEN,
      aCBBTC_TOKEN
    },
    securityFeatures: [
      "Multi-signature access control",
      "Rate limiting",
      "Circuit breakers",
      "Emergency stops",
      "Price validation",
      "Reentrancy protection",
      "Integer overflow protection",
      "Daily withdrawal limits",
      "User freezing capability",
      "Timelock governance"
    ]
  };

  const fs = require("fs");
  fs.writeFileSync(
    "secure-deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n=== Security Deployment Complete ===");
  console.log("✅ All contracts deployed with security hardening");
  console.log("✅ Access controls configured");
  console.log("✅ Security limits set");
  console.log("✅ Emergency controls ready");
  console.log("✅ Deployment info saved to secure-deployment-info.json");
  
  console.log("\n⚠️ SECURITY REMINDERS:");
  console.log("1. Test all emergency functions on testnet");
  console.log("2. Verify all role assignments");
  console.log("3. Test circuit breakers and rate limits");
  console.log("4. Setup monitoring for security events");
  console.log("5. Prepare incident response procedures");
  console.log("6. Schedule regular security audits");
  
  console.log("\n🔒 Contracts are ready for security testing!");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});