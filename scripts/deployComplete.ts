import { ethers } from 'hardhat';
import { config } from 'dotenv';

config();

async function main() {
  console.log('🚀 Deploying Complete MinerFi System...\n');
  
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)));
  
  // Contract addresses on Base Network
  const CBBTC_TOKEN_ADDRESS = process.env.CBBTC_TOKEN_ADDRESS || '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf';
  const CHAINLINK_BTC_USD_FEED = process.env.CHAINLINK_BTC_USD_FEED || '0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69';
  const AAVE_V3_POOL_ADDRESS = process.env.AAVE_V3_POOL_ADDRESS || '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';
  
  const deployedContracts: { [key: string]: string } = {};
  
  try {
    // 1. Deploy Security Manager
    console.log('1️⃣ Deploying SecurityManager...');
    const SecurityManager = await ethers.getContractFactory('SecurityManager');
    const securityManager = await SecurityManager.deploy();
    await securityManager.waitForDeployment();
    deployedContracts['SecurityManager'] = await securityManager.getAddress();
    console.log('✅ SecurityManager deployed to:', deployedContracts['SecurityManager']);
    
    // 2. Deploy Mining Token
    console.log('\n2️⃣ Deploying cbBTCMiningToken...');
    const MiningToken = await ethers.getContractFactory('cbBTCMiningToken');
    const miningToken = await MiningToken.deploy();
    await miningToken.waitForDeployment();
    deployedContracts['MiningToken'] = await miningToken.getAddress();
    console.log('✅ cbBTCMiningToken deployed to:', deployedContracts['MiningToken']);
    
    // 3. Deploy Chainlink Oracle
    console.log('\n3️⃣ Deploying ChainlinkOracle...');
    const ChainlinkOracle = await ethers.getContractFactory('ChainlinkOracle');
    const oracle = await ChainlinkOracle.deploy(CHAINLINK_BTC_USD_FEED);
    await oracle.waitForDeployment();
    deployedContracts['ChainlinkOracle'] = await oracle.getAddress();
    console.log('✅ ChainlinkOracle deployed to:', deployedContracts['ChainlinkOracle']);
    
    // 4. Deploy Aave Integration (placeholder aToken address)
    console.log('\n4️⃣ Deploying AaveIntegration...');
    const AaveIntegration = await ethers.getContractFactory('AaveIntegration');
    const aToken = CBBTC_TOKEN_ADDRESS; // Placeholder - should be actual aToken address
    const aaveIntegration = await AaveIntegration.deploy(
      AAVE_V3_POOL_ADDRESS,
      CBBTC_TOKEN_ADDRESS,
      aToken,
      deployedContracts['MiningToken']
    );
    await aaveIntegration.waitForDeployment();
    deployedContracts['AaveIntegration'] = await aaveIntegration.getAddress();
    console.log('✅ AaveIntegration deployed to:', deployedContracts['AaveIntegration']);
    
    // 5. Deploy Mining Pool
    console.log('\n5️⃣ Deploying MiningPool...');
    const MiningPool = await ethers.getContractFactory('MiningPool');
    const miningPool = await MiningPool.deploy(
      deployedContracts['MiningToken'],
      deployedContracts['ChainlinkOracle'],
      CBBTC_TOKEN_ADDRESS,
      deployedContracts['AaveIntegration']
    );
    await miningPool.waitForDeployment();
    deployedContracts['MiningPool'] = await miningPool.getAddress();
    console.log('✅ MiningPool deployed to:', deployedContracts['MiningPool']);
    
    // 6. Deploy Proof of Reserve
    console.log('\n6️⃣ Deploying ProofOfReserve...');
    const ProofOfReserve = await ethers.getContractFactory('ProofOfReserve');
    const proofOfReserve = await ProofOfReserve.deploy();
    await proofOfReserve.waitForDeployment();
    deployedContracts['ProofOfReserve'] = await proofOfReserve.getAddress();
    console.log('✅ ProofOfReserve deployed to:', deployedContracts['ProofOfReserve']);
    
    // 7. Deploy Auto Reinvestment
    console.log('\n7️⃣ Deploying AutoReinvestment...');
    const AutoReinvestment = await ethers.getContractFactory('AutoReinvestment');
    const autoReinvestment = await AutoReinvestment.deploy(
      deployedContracts['MiningPool'],
      deployedContracts['MiningToken'],
      deployedContracts['ChainlinkOracle'],
      CBBTC_TOKEN_ADDRESS
    );
    await autoReinvestment.waitForDeployment();
    deployedContracts['AutoReinvestment'] = await autoReinvestment.getAddress();
    console.log('✅ AutoReinvestment deployed to:', deployedContracts['AutoReinvestment']);
    
    // 8. Deploy Chainlink Automation
    console.log('\n8️⃣ Deploying ChainlinkAutomation...');
    const ChainlinkAutomation = await ethers.getContractFactory('ChainlinkAutomation');
    const chainlinkAutomation = await ChainlinkAutomation.deploy(
      deployedContracts['MiningPool'],
      deployedContracts['ProofOfReserve'],
      deployedContracts['AutoReinvestment']
    );
    await chainlinkAutomation.waitForDeployment();
    deployedContracts['ChainlinkAutomation'] = await chainlinkAutomation.getAddress();
    console.log('✅ ChainlinkAutomation deployed to:', deployedContracts['ChainlinkAutomation']);
    
    // 9. Initialize contracts
    console.log('\n9️⃣ Initializing contracts...');
    
    // Add MiningPool as minter for MiningToken
    console.log('- Adding MiningPool as minter...');
    await miningToken.addMinter(deployedContracts['MiningPool']);
    
    // Add AaveIntegration as minter for MiningToken (for yield distribution)
    console.log('- Adding AaveIntegration as minter...');
    await miningToken.addMinter(deployedContracts['AaveIntegration']);
    
    // Set MiningPool as authorized caller for AaveIntegration
    console.log('- Setting MiningPool as authorized caller...');
    await aaveIntegration.setAuthorizedCaller(deployedContracts['MiningPool'], true);
    
    // Add a sample mining pool
    console.log('- Creating sample mining pool...');
    await miningPool.createPool(
      'Antminer S21+ Pool',
      ethers.parseEther('0.001'), // 0.001 tokens per day reward rate
      ethers.parseEther('0.01'),  // 0.01 cbBTC minimum stake
      7 * 24 * 60 * 60           // 7 days lockup period
    );
    
    // Update pool hashrate
    console.log('- Setting pool hashrate...');
    await miningPool.updateHashRate(0, 216000000000000); // 216 TH/s in H/s
    
    // Add sample pool to Proof of Reserve
    console.log('- Adding pool to Proof of Reserve...');
    await proofOfReserve.addPool('antminer_s21_pool', '3FUpjxWpEDAMKLuhrsGgQ6bAf8m3EHHn2Y');
    
    // Set ProofOfReserve oracle authorization
    console.log('- Authorizing deployer as oracle...');
    await proofOfReserve.setAuthorizedOracle(deployer.address, true);
    
    // Grant roles to SecurityManager
    console.log('- Setting up SecurityManager roles...');
    const securityManager_contract = SecurityManager.attach(deployedContracts['SecurityManager']);
    const OPERATOR_ROLE = await securityManager_contract.OPERATOR_ROLE();
    await securityManager_contract.grantRole(OPERATOR_ROLE, deployedContracts['MiningPool']);
    await securityManager_contract.grantRole(OPERATOR_ROLE, deployedContracts['AaveIntegration']);
    
    console.log('\n✅ All contracts deployed and initialized successfully!\n');
    
    // 10. Display summary
    console.log('📋 DEPLOYMENT SUMMARY');
    console.log('=====================================');
    for (const [name, address] of Object.entries(deployedContracts)) {
      console.log(`${name.padEnd(20)} : ${address}`);
    }
    
    console.log('\n🔗 External Contracts');
    console.log('=====================================');
    console.log(`${'cbBTC Token'.padEnd(20)} : ${CBBTC_TOKEN_ADDRESS}`);
    console.log(`${'Chainlink BTC/USD'.padEnd(20)} : ${CHAINLINK_BTC_USD_FEED}`);
    console.log(`${'Aave V3 Pool'.padEnd(20)} : ${AAVE_V3_POOL_ADDRESS}`);
    
    console.log('\n🌐 Frontend Environment Variables');
    console.log('=====================================');
    console.log(`REACT_APP_MINING_POOL_ADDRESS=${deployedContracts['MiningPool']}`);
    console.log(`REACT_APP_MINING_TOKEN_ADDRESS=${deployedContracts['MiningToken']}`);
    console.log(`REACT_APP_CHAINLINK_ORACLE_ADDRESS=${deployedContracts['ChainlinkOracle']}`);
    console.log(`REACT_APP_AAVE_INTEGRATION_ADDRESS=${deployedContracts['AaveIntegration']}`);
    console.log(`REACT_APP_PROOF_OF_RESERVE_ADDRESS=${deployedContracts['ProofOfReserve']}`);
    console.log(`REACT_APP_AUTO_REINVESTMENT_ADDRESS=${deployedContracts['AutoReinvestment']}`);
    console.log(`REACT_APP_CHAINLINK_AUTOMATION_ADDRESS=${deployedContracts['ChainlinkAutomation']}`);
    console.log(`REACT_APP_SECURITY_MANAGER_ADDRESS=${deployedContracts['SecurityManager']}`);
    console.log(`REACT_APP_CBBTC_TOKEN_ADDRESS=${CBBTC_TOKEN_ADDRESS}`);
    
    console.log('\n🔧 Next Steps');
    console.log('=====================================');
    console.log('1. Update frontend .env file with above contract addresses');
    console.log('2. Verify contracts on Basescan');
    console.log('3. Set up Chainlink Automation subscription');
    console.log('4. Fund MiningPool with initial cbBTC rewards');
    console.log('5. Configure security parameters');
    console.log('6. Set up monitoring and alerting');
    console.log('7. Conduct security audit');
    
    // 11. Create verification script
    const verificationScript = `
# Verify contracts on Basescan
npx hardhat verify --network base ${deployedContracts['SecurityManager']}
npx hardhat verify --network base ${deployedContracts['MiningToken']}
npx hardhat verify --network base ${deployedContracts['ChainlinkOracle']} "${CHAINLINK_BTC_USD_FEED}"
npx hardhat verify --network base ${deployedContracts['AaveIntegration']} "${AAVE_V3_POOL_ADDRESS}" "${CBBTC_TOKEN_ADDRESS}" "${aToken}" "${deployedContracts['MiningToken']}"
npx hardhat verify --network base ${deployedContracts['MiningPool']} "${deployedContracts['MiningToken']}" "${deployedContracts['ChainlinkOracle']}" "${CBBTC_TOKEN_ADDRESS}" "${deployedContracts['AaveIntegration']}"
npx hardhat verify --network base ${deployedContracts['ProofOfReserve']}
npx hardhat verify --network base ${deployedContracts['AutoReinvestment']} "${deployedContracts['MiningPool']}" "${deployedContracts['MiningToken']}" "${deployedContracts['ChainlinkOracle']}" "${CBBTC_TOKEN_ADDRESS}"
npx hardhat verify --network base ${deployedContracts['ChainlinkAutomation']} "${deployedContracts['MiningPool']}" "${deployedContracts['ProofOfReserve']}" "${deployedContracts['AutoReinvestment']}"
`;
    
    console.log('\n📝 Contract Verification Commands');
    console.log('=====================================');
    console.log(verificationScript);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });