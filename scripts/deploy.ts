import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Contract addresses for Base network
  const BTC_PRICE_FEED = process.env.CHAINLINK_BTC_USD_FEED || "0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69";
  const AAVE_POOL = process.env.AAVE_V3_POOL_ADDRESS || "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
  const CBBTC_TOKEN = process.env.CBBTC_TOKEN_ADDRESS || "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf";
  
  console.log("Using BTC Price Feed:", BTC_PRICE_FEED);
  console.log("Using Aave Pool:", AAVE_POOL);
  console.log("Using cbBTC Token:", CBBTC_TOKEN);

  // Deploy ChainlinkOracle
  console.log("\n=== Deploying ChainlinkOracle ===");
  const ChainlinkOracle = await ethers.getContractFactory("ChainlinkOracle");
  const oracle = await ChainlinkOracle.deploy(BTC_PRICE_FEED);
  await oracle.deployed();
  console.log("ChainlinkOracle deployed to:", oracle.address);

  // Deploy cbBTCMiningToken
  console.log("\n=== Deploying cbBTCMiningToken ===");
  const cbBTCMiningToken = await ethers.getContractFactory("cbBTCMiningToken");
  const miningToken = await cbBTCMiningToken.deploy();
  await miningToken.deployed();
  console.log("cbBTCMiningToken deployed to:", miningToken.address);

  // Deploy MiningPool
  console.log("\n=== Deploying MiningPool ===");
  const MiningPool = await ethers.getContractFactory("MiningPool");
  const miningPool = await MiningPool.deploy(
    miningToken.address,
    oracle.address,
    CBBTC_TOKEN
  );
  await miningPool.deployed();
  console.log("MiningPool deployed to:", miningPool.address);

  // Deploy AaveIntegration
  console.log("\n=== Deploying AaveIntegration ===");
  const AaveIntegration = await ethers.getContractFactory("AaveIntegration");
  
  // For Base network, we need to get the aToken address for cbBTC
  // This is a placeholder - you'd need to get the actual aToken address
  const aCBBTC_TOKEN = "0x0000000000000000000000000000000000000000"; // Replace with actual aToken
  
  const aaveIntegration = await AaveIntegration.deploy(
    AAVE_POOL,
    CBBTC_TOKEN,
    aCBBTC_TOKEN,
    miningToken.address
  );
  await aaveIntegration.deployed();
  console.log("AaveIntegration deployed to:", aaveIntegration.address);

  // Setup permissions
  console.log("\n=== Setting up permissions ===");
  
  // Add MiningPool as minter for cbBTCMiningToken
  await miningToken.addMinter(miningPool.address);
  console.log("Added MiningPool as minter for cbBTCMiningToken");

  // Add AaveIntegration as minter for cbBTCMiningToken
  await miningToken.addMinter(aaveIntegration.address);
  console.log("Added AaveIntegration as minter for cbBTCMiningToken");

  // Authorize MiningPool to call AaveIntegration
  await aaveIntegration.setAuthorizedCaller(miningPool.address, true);
  console.log("Authorized MiningPool to call AaveIntegration");

  // Create initial mining pool
  console.log("\n=== Creating initial mining pool ===");
  await miningPool.createPool(
    "Bitcoin Mining Pool #1",
    ethers.utils.parseEther("0.1"), // 0.1 tokens per second reward rate
    ethers.utils.parseEther("0.01"), // 0.01 cbBTC minimum stake
    86400 // 1 day lockup period
  );
  console.log("Created initial mining pool");

  // Display deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log("ChainlinkOracle:", oracle.address);
  console.log("cbBTCMiningToken:", miningToken.address);
  console.log("MiningPool:", miningPool.address);
  console.log("AaveIntegration:", aaveIntegration.address);
  
  // Save deployment info to file
  const deploymentInfo = {
    network: "base",
    chainId: 8453,
    contracts: {
      ChainlinkOracle: oracle.address,
      cbBTCMiningToken: miningToken.address,
      MiningPool: miningPool.address,
      AaveIntegration: aaveIntegration.address
    },
    externalContracts: {
      BTC_PRICE_FEED,
      AAVE_POOL,
      CBBTC_TOKEN,
      aCBBTC_TOKEN
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\nDeployment info saved to deployment-info.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});