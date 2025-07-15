import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("🔒 Security Tests for Mining Contracts", function () {
  
  async function deploySecureContractsFixture() {
    const [owner, admin, operator, yieldManager, emergency, user1, user2, attacker] = await ethers.getSigners();
    
    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    const cbBTC = await MockERC20.deploy("Coinbase Wrapped BTC", "cbBTC", 8);
    const aToken = await MockERC20.deploy("Aave cbBTC", "acbBTC", 8);
    
    // Deploy mock Chainlink aggregator
    const MockAggregator = await ethers.getContractFactory("MockChainlinkAggregator");
    const btcPriceFeed = await MockAggregator.deploy(4500000000000); // $45,000 with 8 decimals
    
    // Deploy mock Aave pool
    const MockAavePool = await ethers.getContractFactory("MockAavePool");
    const aavePool = await MockAavePool.deploy(cbBTC.address, aToken.address);
    
    // Deploy secure contracts
    const SecureTokenizedMining = await ethers.getContractFactory("SecureTokenizedMining");
    const secureMining = await SecureTokenizedMining.deploy(
      usdc.address,
      btcPriceFeed.address,
      admin.address
    );
    
    const SecureAaveIntegration = await ethers.getContractFactory("SecureAaveIntegration");
    const secureAave = await SecureAaveIntegration.deploy(
      aavePool.address,
      cbBTC.address,
      aToken.address,
      admin.address
    );
    
    // Setup roles
    const ADMIN_ROLE = await secureMining.ADMIN_ROLE();
    const OPERATOR_ROLE = await secureMining.OPERATOR_ROLE();
    const YIELD_MANAGER_ROLE = await secureMining.YIELD_MANAGER_ROLE();
    const EMERGENCY_ROLE = await secureMining.EMERGENCY_ROLE();
    
    await secureMining.connect(admin).grantRole(OPERATOR_ROLE, operator.address);
    await secureMining.connect(admin).grantRole(YIELD_MANAGER_ROLE, yieldManager.address);
    await secureMining.connect(admin).grantRole(EMERGENCY_ROLE, emergency.address);
    
    // Mint test tokens
    await usdc.mint(user1.address, ethers.utils.parseUnits("100000", 6));
    await usdc.mint(user2.address, ethers.utils.parseUnits("100000", 6));
    await usdc.mint(attacker.address, ethers.utils.parseUnits("100000", 6));
    
    await cbBTC.mint(user1.address, ethers.utils.parseUnits("10", 8));
    await cbBTC.mint(user2.address, ethers.utils.parseUnits("10", 8));
    
    return {
      secureMining,
      secureAave,
      usdc,
      cbBTC,
      aToken,
      btcPriceFeed,
      aavePool,
      owner,
      admin,
      operator,
      yieldManager,
      emergency,
      user1,
      user2,
      attacker
    };
  }
  
  describe("🛡️ Access Control Tests", function () {
    
    it("Should prevent unauthorized role assignment", async function () {
      const { secureMining, user1, attacker } = await loadFixture(deploySecureContractsFixture);
      
      const ADMIN_ROLE = await secureMining.ADMIN_ROLE();
      
      await expect(
        secureMining.connect(attacker).grantRole(ADMIN_ROLE, attacker.address)
      ).to.be.revertedWith("AccessControl:");
    });
    
    it("Should prevent non-yield-manager from distributing rewards", async function () {
      const { secureMining, attacker } = await loadFixture(deploySecureContractsFixture);
      
      await expect(
        secureMining.connect(attacker).distributeDefiEarnings(1, 1000)
      ).to.be.revertedWith("AccessControl:");
    });
    
    it("Should prevent non-emergency role from triggering emergency stop", async function () {
      const { secureMining, attacker } = await loadFixture(deploySecureContractsFixture);
      
      await expect(
        secureMining.connect(attacker).triggerEmergencyStop()
      ).to.be.revertedWith("AccessControl:");
    });
  });
  
  describe("🔄 Reentrancy Protection Tests", function () {
    
    it("Should prevent reentrancy attacks on claimEarnings", async function () {
      const { secureMining, usdc, user1 } = await loadFixture(deploySecureContractsFixture);
      
      // Purchase position
      await usdc.connect(user1).approve(secureMining.address, ethers.utils.parseUnits("700", 6));
      await secureMining.connect(user1).purchaseMiningPosition(20);
      
      // Deploy malicious contract that attempts reentrancy
      const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
      const maliciousReceiver = await MaliciousReceiver.deploy(secureMining.address);
      
      // Transfer token to malicious contract
      await secureMining.connect(user1).transferFrom(user1.address, maliciousReceiver.address, 1);
      
      // Attempt reentrancy attack
      await expect(
        maliciousReceiver.attackClaimEarnings(1)
      ).to.be.revertedWith("ReentrancyGuard: reentrant call");
    });
  });
  
  describe("📊 Integer Overflow Protection Tests", function () {
    
    it("Should prevent overflow in purchase cost calculation", async function () {
      const { secureMining, user1 } = await loadFixture(deploySecureContractsFixture);
      
      // Attempt to purchase with maximum uint256 value
      const maxUint = ethers.constants.MaxUint256;
      
      await expect(
        secureMining.connect(user1).purchaseMiningPosition(maxUint)
      ).to.be.revertedWithCustomError(secureMining, "InvalidTHAmount");
    });
    
    it("Should handle large but valid TH amounts correctly", async function () {
      const { secureMining, usdc, user1 } = await loadFixture(deploySecureContractsFixture);
      
      const validTHAmount = 50; // Maximum allowed
      const expectedCost = ethers.utils.parseUnits("1750", 6); // 50 * 35 USDC
      
      await usdc.connect(user1).approve(secureMining.address, expectedCost);
      await expect(
        secureMining.connect(user1).purchaseMiningPosition(validTHAmount)
      ).to.not.be.reverted;
    });
  });
  
  describe("⏱️ Rate Limiting Tests", function () {
    
    it("Should enforce rate limits on rapid purchases", async function () {
      const { secureMining, usdc, user1 } = await loadFixture(deploySecureContractsFixture);
      
      const purchaseAmount = ethers.utils.parseUnits("3500", 6); // 5 * 700 USDC
      await usdc.connect(user1).approve(secureMining.address, purchaseAmount);
      
      // Make multiple rapid purchases
      for (let i = 0; i < 10; i++) {
        await secureMining.connect(user1).purchaseMiningPosition(20);
      }
      
      // 11th purchase should fail due to rate limiting
      await expect(
        secureMining.connect(user1).purchaseMiningPosition(20)
      ).to.be.revertedWithCustomError(secureMining, "RateLimitExceeded");
    });
    
    it("Should reset rate limits after time window", async function () {
      const { secureMining, usdc, user1 } = await loadFixture(deploySecureContractsFixture);
      
      await usdc.connect(user1).approve(secureMining.address, ethers.utils.parseUnits("14000", 6));
      
      // Make maximum purchases
      for (let i = 0; i < 10; i++) {
        await secureMining.connect(user1).purchaseMiningPosition(20);
      }
      
      // Fast-forward time by 1 hour + 1 second
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
      
      // Should be able to purchase again
      await expect(
        secureMining.connect(user1).purchaseMiningPosition(20)
      ).to.not.be.reverted;
    });
  });
  
  describe("🔍 Oracle Security Tests", function () {
    
    it("Should reject stale price data", async function () {
      const { secureMining, btcPriceFeed } = await loadFixture(deploySecureContractsFixture);
      
      // Set old timestamp (more than 1 hour ago)
      const staleTimestamp = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago
      await btcPriceFeed.setLatestRoundData(1, 4500000000000, staleTimestamp, staleTimestamp, 1);
      
      await expect(
        secureMining.getBTCPrice()
      ).to.be.revertedWith("Price too old");
    });
    
    it("Should reject prices outside bounds", async function () {
      const { secureMining, btcPriceFeed } = await loadFixture(deploySecureContractsFixture);
      
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Test price below minimum ($10,000)
      await btcPriceFeed.setLatestRoundData(1, 500000000000, currentTime, currentTime, 1); // $5,000
      await expect(
        secureMining.getBTCPrice()
      ).to.be.revertedWith("Price below minimum threshold");
      
      // Test price above maximum ($500,000)
      await btcPriceFeed.setLatestRoundData(1, 60000000000000, currentTime, currentTime, 1); // $600,000
      await expect(
        secureMining.getBTCPrice()
      ).to.be.revertedWith("Price above maximum threshold");
    });
    
    it("Should reject prices with high deviation", async function () {
      const { secureMining, btcPriceFeed, operator } = await loadFixture(deploySecureContractsFixture);
      
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Set initial valid price
      await secureMining.connect(operator).updateLastValidPrice("BTC/USD", 4500000000000); // $45,000
      
      // Try to set price with >10% deviation
      await btcPriceFeed.setLatestRoundData(1, 5500000000000, currentTime, currentTime, 1); // $55,000 (+22%)
      
      await expect(
        secureMining.getBTCPrice()
      ).to.be.revertedWith("Price deviation too high");
    });
  });
  
  describe("🚨 Emergency Controls Tests", function () {
    
    it("Should prevent operations during emergency stop", async function () {
      const { secureMining, usdc, user1, emergency } = await loadFixture(deploySecureContractsFixture);
      
      // Trigger emergency stop
      await secureMining.connect(emergency).triggerEmergencyStop();
      
      // Attempt purchase during emergency
      await usdc.connect(user1).approve(secureMining.address, ethers.utils.parseUnits("700", 6));
      await expect(
        secureMining.connect(user1).purchaseMiningPosition(20)
      ).to.be.revertedWithCustomError(secureMining, "EmergencyModeActive");
    });
    
    it("Should require 24-hour delay to remove emergency stop", async function () {
      const { secureMining, emergency } = await loadFixture(deploySecureContractsFixture);
      
      // Trigger emergency stop
      await secureMining.connect(emergency).triggerEmergencyStop();
      
      // Try to remove immediately
      await expect(
        secureMining.connect(emergency).removeEmergencyStop()
      ).to.be.revertedWith("Must wait 24 hours");
      
      // Fast-forward 24 hours
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      
      // Should now be able to remove
      await expect(
        secureMining.connect(emergency).removeEmergencyStop()
      ).to.not.be.reverted;
    });
  });
  
  describe("💰 Financial Security Tests", function () {
    
    it("Should enforce daily claim limits", async function () {
      const { secureMining, usdc, user1, yieldManager } = await loadFixture(deploySecureContractsFixture);
      
      // Purchase position
      await usdc.connect(user1).approve(secureMining.address, ethers.utils.parseUnits("700", 6));
      await secureMining.connect(user1).purchaseMiningPosition(20);
      
      // Add some DeFi earnings
      await secureMining.connect(yieldManager).distributeDefiEarnings(1, ethers.utils.parseUnits("10", 6));
      
      // Claim maximum times (5 per day)
      for (let i = 0; i < 5; i++) {
        await secureMining.connect(user1).claimEarnings(1);
      }
      
      // 6th claim should fail
      await expect(
        secureMining.connect(user1).claimEarnings(1)
      ).to.be.revertedWithCustomError(secureMining, "DailyClaimLimitExceeded");
    });
    
    it("Should enforce contract balance limits", async function () {
      const { secureMining, usdc, user1, admin } = await loadFixture(deploySecureContractsFixture);
      
      // Set very low contract balance limit
      await secureMining.connect(admin).setMaxContractBalance(ethers.utils.parseUnits("500", 6));
      
      // Try to purchase above limit
      await usdc.connect(user1).approve(secureMining.address, ethers.utils.parseUnits("700", 6));
      await expect(
        secureMining.connect(user1).purchaseMiningPosition(20)
      ).to.be.revertedWith("Contract balance limit exceeded");
    });
    
    it("Should prevent unauthorized withdrawals", async function () {
      const { secureMining, usdc, user1, attacker } = await loadFixture(deploySecureContractsFixture);
      
      // Purchase position as user1
      await usdc.connect(user1).approve(secureMining.address, ethers.utils.parseUnits("700", 6));
      await secureMining.connect(user1).purchaseMiningPosition(20);
      
      // Attacker tries to claim user1's earnings
      await expect(
        secureMining.connect(attacker).claimEarnings(1)
      ).to.be.revertedWithCustomError(secureMining, "UnauthorizedAccess");
    });
  });
  
  describe("🔄 Aave Integration Security Tests", function () {
    
    it("Should enforce deposit limits in Aave integration", async function () {
      const { secureAave, cbBTC, user1, admin } = await loadFixture(deploySecureContractsFixture);
      
      // Grant depositor role
      const DEPOSITOR_ROLE = await secureAave.DEPOSITOR_ROLE();
      await secureAave.connect(admin).grantRole(DEPOSITOR_ROLE, user1.address);
      
      // Try to deposit more than daily limit
      const largeAmount = ethers.utils.parseUnits("200000", 8); // > 100,000 daily limit
      await cbBTC.connect(user1).approve(secureAave.address, largeAmount);
      
      await expect(
        secureAave.connect(user1).depositToAave(largeAmount)
      ).to.be.revertedWithCustomError(secureAave, "ExceedsLimit");
    });
    
    it("Should prevent operations on frozen users", async function () {
      const { secureAave, cbBTC, user1, admin } = await loadFixture(deploySecureContractsFixture);
      
      // Grant roles
      const DEPOSITOR_ROLE = await secureAave.DEPOSITOR_ROLE();
      await secureAave.connect(admin).grantRole(DEPOSITOR_ROLE, user1.address);
      
      // Freeze user
      await secureAave.connect(admin).freezeUser(user1.address, "Suspicious activity");
      
      // Try to deposit as frozen user
      await cbBTC.connect(user1).approve(secureAave.address, ethers.utils.parseUnits("1", 8));
      await expect(
        secureAave.connect(user1).depositToAave(ethers.utils.parseUnits("1", 8))
      ).to.be.revertedWithCustomError(secureAave, "UserFrozen");
    });
  });
  
  describe("⚡ Circuit Breaker Tests", function () {
    
    it("Should trigger circuit breaker on large aToken supply changes", async function () {
      const { secureAave, aToken } = await loadFixture(deploySecureContractsFixture);
      
      // Simulate large supply change (>10%)
      const currentSupply = await aToken.totalSupply();
      const largeIncrease = currentSupply.mul(15).div(100); // 15% increase
      
      await aToken.mint(secureAave.address, largeIncrease);
      
      // Circuit breaker should be triggered on next operation
      expect(await secureAave.circuitBreakerTriggered()).to.be.true;
      expect(await secureAave.paused()).to.be.true;
    });
  });
  
  describe("🎯 Integration Attack Scenarios", function () {
    
    it("Should prevent flash loan attacks", async function () {
      // This test would simulate a flash loan attack scenario
      // where an attacker tries to manipulate prices or drain funds
      const { secureMining, usdc, user1 } = await loadFixture(deploySecureContractsFixture);
      
      // Deploy flash loan attacker contract
      const FlashLoanAttacker = await ethers.getContractFactory("FlashLoanAttacker");
      const attacker = await FlashLoanAttacker.deploy(secureMining.address, usdc.address);
      
      // Mint large amount to simulate flash loan
      await usdc.mint(attacker.address, ethers.utils.parseUnits("1000000", 6));
      
      // Attempt attack
      await expect(
        attacker.executeFlashLoanAttack()
      ).to.be.reverted; // Should fail due to security measures
    });
    
    it("Should prevent sandwich attacks on oracle prices", async function () {
      const { secureMining, btcPriceFeed } = await loadFixture(deploySecureContractsFixture);
      
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Attacker tries to manipulate price just before legitimate transaction
      await btcPriceFeed.setLatestRoundData(1, 4000000000000, currentTime, currentTime, 1); // $40,000
      
      // Due to price deviation checks, this should fail
      await expect(
        secureMining.getBTCPrice()
      ).to.be.revertedWith("Price deviation too high");
    });
  });
});

// Mock contracts for testing

// Mock ERC20 contract
contract MockERC20 {
  constructor(string memory name, string memory symbol, uint8 decimals) {}
  function mint(address to, uint256 amount) external {}
  function balanceOf(address account) external view returns (uint256) {}
  function transfer(address to, uint256 amount) external returns (bool) {}
  function approve(address spender, uint256 amount) external returns (bool) {}
  function allowance(address owner, address spender) external view returns (uint256) {}
}

// Mock Chainlink Aggregator
contract MockChainlinkAggregator {
  int256 private _price;
  uint256 private _timestamp;
  uint80 private _roundId;
  
  constructor(int256 initialPrice) {
    _price = initialPrice;
    _timestamp = block.timestamp;
    _roundId = 1;
  }
  
  function latestRoundData() external view returns (
    uint80 roundId,
    int256 answer,
    uint256 startedAt,
    uint256 updatedAt,
    uint80 answeredInRound
  ) {
    return (_roundId, _price, _timestamp, _timestamp, _roundId);
  }
  
  function setLatestRoundData(
    uint80 roundId,
    int256 answer,
    uint256 startedAt,
    uint256 updatedAt,
    uint80 answeredInRound
  ) external {
    _roundId = roundId;
    _price = answer;
    _timestamp = updatedAt;
  }
}

// Mock Aave Pool
contract MockAavePool {
  IERC20 public asset;
  IERC20 public aToken;
  
  constructor(address _asset, address _aToken) {
    asset = IERC20(_asset);
    aToken = IERC20(_aToken);
  }
  
  function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external {
    // Mock implementation
  }
  
  function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
    return amount;
  }
}

// Malicious contracts for testing

contract MaliciousReceiver {
  address public target;
  bool public attacking;
  
  constructor(address _target) {
    target = _target;
  }
  
  function attackClaimEarnings(uint256 tokenId) external {
    attacking = true;
    // This would attempt to re-enter claimEarnings
    // But should be blocked by ReentrancyGuard
  }
  
  receive() external payable {
    if (attacking) {
      // Attempt reentrancy
      bytes memory data = abi.encodeWithSignature("claimEarnings(uint256)", 1);
      (bool success,) = target.call(data);
      require(success, "Reentrancy attack failed");
    }
  }
}

contract FlashLoanAttacker {
  address public target;
  address public token;
  
  constructor(address _target, address _token) {
    target = _target;
    token = _token;
  }
  
  function executeFlashLoanAttack() external {
    // Mock flash loan attack implementation
    // Would try various attack vectors but should be blocked
  }
}