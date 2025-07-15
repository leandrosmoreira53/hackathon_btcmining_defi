// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./MiningPool.sol";
import "./cbBTCMiningToken.sol";
import "./ChainlinkOracle.sol";

contract AutoReinvestment is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    struct ReinvestmentPlan {
        bool enabled;
        uint256 percentage;          // Percentage of rewards to reinvest (0-100)
        uint256 minReinvestAmount;   // Minimum amount to trigger reinvestment
        uint256 targetPoolId;        // Pool to reinvest into
        uint256 lastReinvestment;    // Timestamp of last reinvestment
        uint256 totalReinvested;     // Total amount reinvested
        uint256 compoundFrequency;   // Frequency in seconds (daily = 86400)
    }
    
    struct UserReinvestment {
        uint256 totalReinvested;
        uint256 additionalHashrate;
        uint256 lastCompound;
        uint256 rewardsGenerated;
    }
    
    MiningPool public miningPool;
    cbBTCMiningToken public miningToken;
    ChainlinkOracle public oracle;
    IERC20 public cbBTC;
    
    mapping(address => ReinvestmentPlan) public reinvestmentPlans;
    mapping(address => UserReinvestment) public userReinvestments;
    mapping(address => bool) public autoReinvestEnabled;
    
    uint256 public constant TH_PRICE = 35 * 1e18; // $35 per TH in wei
    uint256 public constant TH_PER_TOKEN = 20 * 1e18; // 20 TH per token
    uint256 public totalReinvestedAmount;
    uint256 public totalAdditionalHashrate;
    
    event ReinvestmentPlanUpdated(address indexed user, bool enabled, uint256 percentage);
    event AutoReinvestmentExecuted(address indexed user, uint256 amount, uint256 hashrateAdded);
    event ManualReinvestment(address indexed user, uint256 amount, uint256 poolId);
    event CompoundRewardsCalculated(address indexed user, uint256 additionalRewards);
    
    constructor(
        address _miningPool,
        address _miningToken,
        address _oracle,
        address _cbBTC
    ) {
        require(_miningPool != address(0), "AutoReinvestment: invalid mining pool");
        require(_miningToken != address(0), "AutoReinvestment: invalid mining token");
        require(_oracle != address(0), "AutoReinvestment: invalid oracle");
        require(_cbBTC != address(0), "AutoReinvestment: invalid cbBTC");
        
        miningPool = MiningPool(_miningPool);
        miningToken = cbBTCMiningToken(_miningToken);
        oracle = ChainlinkOracle(_oracle);
        cbBTC = IERC20(_cbBTC);
    }
    
    function setupReinvestmentPlan(
        uint256 percentage,
        uint256 minReinvestAmount,
        uint256 targetPoolId,
        uint256 compoundFrequency
    ) external {
        require(percentage <= 100, "AutoReinvestment: invalid percentage");
        require(minReinvestAmount > 0, "AutoReinvestment: invalid minimum amount");
        require(compoundFrequency >= 3600, "AutoReinvestment: frequency too low"); // Minimum 1 hour
        
        reinvestmentPlans[msg.sender] = ReinvestmentPlan({
            enabled: true,
            percentage: percentage,
            minReinvestAmount: minReinvestAmount,
            targetPoolId: targetPoolId,
            lastReinvestment: block.timestamp,
            totalReinvested: 0,
            compoundFrequency: compoundFrequency
        });
        
        autoReinvestEnabled[msg.sender] = true;
        
        emit ReinvestmentPlanUpdated(msg.sender, true, percentage);
    }
    
    function enableAutoReinvestment() external {
        require(reinvestmentPlans[msg.sender].percentage > 0, "AutoReinvestment: no plan configured");
        autoReinvestEnabled[msg.sender] = true;
        reinvestmentPlans[msg.sender].enabled = true;
        
        emit ReinvestmentPlanUpdated(msg.sender, true, reinvestmentPlans[msg.sender].percentage);
    }
    
    function disableAutoReinvestment() external {
        autoReinvestEnabled[msg.sender] = false;
        reinvestmentPlans[msg.sender].enabled = false;
        
        emit ReinvestmentPlanUpdated(msg.sender, false, 0);
    }
    
    function executeAutoReinvestment(address user) external {
        require(autoReinvestEnabled[user], "AutoReinvestment: auto reinvestment disabled");
        
        ReinvestmentPlan storage plan = reinvestmentPlans[user];
        require(plan.enabled, "AutoReinvestment: plan not enabled");
        require(
            block.timestamp >= plan.lastReinvestment + plan.compoundFrequency,
            "AutoReinvestment: too early for next reinvestment"
        );
        
        // Get user's pending rewards from all pools
        uint256 totalRewards = 0;
        uint256 poolCount = miningPool.poolCount();
        
        for (uint256 i = 0; i < poolCount; i++) {
            uint256 pendingRewards = miningPool.getPendingRewards(i, user);
            uint256 pendingCbBTC = miningPool.getPendingCbBTCRewards(i, user);
            totalRewards += pendingRewards + pendingCbBTC;
        }
        
        // Calculate reinvestment amount
        uint256 reinvestAmount = (totalRewards * plan.percentage) / 100;
        
        if (reinvestAmount >= plan.minReinvestAmount) {
            // Execute reinvestment
            _executeReinvestment(user, reinvestAmount, plan.targetPoolId);
            
            // Update plan
            plan.lastReinvestment = block.timestamp;
            plan.totalReinvested += reinvestAmount;
        }
    }
    
    function manualReinvestment(uint256 amount, uint256 poolId) external nonReentrant whenNotPaused {
        require(amount > 0, "AutoReinvestment: amount must be greater than 0");
        require(cbBTC.balanceOf(msg.sender) >= amount, "AutoReinvestment: insufficient balance");
        
        _executeReinvestment(msg.sender, amount, poolId);
        
        emit ManualReinvestment(msg.sender, amount, poolId);
    }
    
    function _executeReinvestment(address user, uint256 amount, uint256 poolId) internal {
        // Transfer cbBTC from user
        cbBTC.safeTransferFrom(user, address(this), amount);
        
        // Calculate hashrate to purchase
        (int256 btcPrice, ) = oracle.getBTCPrice();
        require(btcPrice > 0, "AutoReinvestment: invalid BTC price");
        
        uint256 usdValue = (amount * uint256(btcPrice)) / 1e8; // Convert to USD
        uint256 hashrateAmount = (usdValue * 1e18) / TH_PRICE; // Calculate TH amount
        
        // Approve and stake in mining pool
        cbBTC.safeApprove(address(miningPool), amount);
        miningPool.stake(poolId, amount);
        
        // Update user reinvestment data
        UserReinvestment storage userReinvest = userReinvestments[user];
        userReinvest.totalReinvested += amount;
        userReinvest.additionalHashrate += hashrateAmount;
        userReinvest.lastCompound = block.timestamp;
        
        // Update global statistics
        totalReinvestedAmount += amount;
        totalAdditionalHashrate += hashrateAmount;
        
        emit AutoReinvestmentExecuted(user, amount, hashrateAmount);
    }
    
    function calculateCompoundRewards(address user) external view returns (uint256) {
        UserReinvestment storage userReinvest = userReinvestments[user];
        
        if (userReinvest.additionalHashrate == 0) {
            return 0;
        }
        
        // Calculate time since last compound
        uint256 timeElapsed = block.timestamp - userReinvest.lastCompound;
        
        // Calculate daily reward rate (simplified)
        uint256 dailyRate = 75; // $0.075 per TH per day in cents
        uint256 dailyRewards = (userReinvest.additionalHashrate * dailyRate) / 1000; // Convert to dollars
        
        // Calculate rewards for elapsed time
        uint256 additionalRewards = (dailyRewards * timeElapsed) / 1 days;
        
        return additionalRewards;
    }
    
    function updateCompoundRewards(address user) external {
        uint256 additionalRewards = this.calculateCompoundRewards(user);
        
        if (additionalRewards > 0) {
            UserReinvestment storage userReinvest = userReinvestments[user];
            userReinvest.rewardsGenerated += additionalRewards;
            userReinvest.lastCompound = block.timestamp;
            
            emit CompoundRewardsCalculated(user, additionalRewards);
        }
    }
    
    function getOptimalReinvestmentStrategy(address user) external view returns (
        uint256 recommendedPercentage,
        uint256 projectedROI,
        uint256 breakEvenTime,
        string memory strategy
    ) {
        // Get user's current stake and rewards
        uint256 totalStaked = 0;
        uint256 totalRewards = 0;
        uint256 poolCount = miningPool.poolCount();
        
        for (uint256 i = 0; i < poolCount; i++) {
            (uint256 userAmount, , , ) = miningPool.getUserInfo(i, user);
            totalStaked += userAmount;
            totalRewards += miningPool.getPendingRewards(i, user);
        }
        
        // Calculate optimal strategy based on current performance
        if (totalStaked == 0) {
            return (0, 0, 0, "No stake found");
        }
        
        uint256 currentROI = (totalRewards * 365 * 100) / totalStaked; // Annualized ROI
        
        if (currentROI > 77) { // Above target ROI
            return (80, currentROI + 10, 12, "Aggressive reinvestment");
        } else if (currentROI > 50) {
            return (60, currentROI + 5, 15, "Moderate reinvestment");
        } else {
            return (40, currentROI + 2, 18, "Conservative reinvestment");
        }
    }
    
    function bulkExecuteReinvestments(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            if (autoReinvestEnabled[users[i]]) {
                try this.executeAutoReinvestment(users[i]) {
                    // Success
                } catch {
                    // Skip failed reinvestments
                    continue;
                }
            }
        }
    }
    
    function getUserReinvestmentData(address user) external view returns (
        bool enabled,
        uint256 percentage,
        uint256 totalReinvested,
        uint256 additionalHashrate,
        uint256 rewardsGenerated,
        uint256 lastCompound
    ) {
        ReinvestmentPlan storage plan = reinvestmentPlans[user];
        UserReinvestment storage userReinvest = userReinvestments[user];
        
        return (
            plan.enabled,
            plan.percentage,
            userReinvest.totalReinvested,
            userReinvest.additionalHashrate,
            userReinvest.rewardsGenerated,
            userReinvest.lastCompound
        );
    }
    
    function getGlobalReinvestmentStats() external view returns (
        uint256 totalReinvested,
        uint256 totalHashrateAdded,
        uint256 activeUsers,
        uint256 averageReinvestmentPercentage
    ) {
        // Count active users (simplified - in production, use enumerable sets)
        uint256 activeCount = 0;
        uint256 totalPercentage = 0;
        
        // Note: This is inefficient for large datasets
        // In production, maintain separate tracking
        
        return (
            totalReinvestedAmount,
            totalAdditionalHashrate,
            activeCount,
            activeCount > 0 ? totalPercentage / activeCount : 0
        );
    }
    
    function updateTHPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "AutoReinvestment: invalid price");
        // Note: TH_PRICE is constant, would need to make it mutable
        // This is a placeholder for the functionality
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}