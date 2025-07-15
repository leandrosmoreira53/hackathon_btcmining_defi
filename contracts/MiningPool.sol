// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./cbBTCMiningToken.sol";
import "./ChainlinkOracle.sol";

contract MiningPool is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    struct Pool {
        string name;
        uint256 totalHashRate;
        uint256 totalStaked;
        uint256 rewardRate;
        uint256 lastRewardTime;
        uint256 accRewardPerShare;
        bool active;
        uint256 minimumStake;
        uint256 lockupPeriod;
    }
    
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 stakeTime;
        uint256 lastClaimTime;
    }
    
    cbBTCMiningToken public miningToken;
    ChainlinkOracle public oracle;
    IERC20 public cbBTC;
    
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    
    uint256 public poolCount;
    uint256 public constant PRECISION = 1e18;
    uint256 public constant REWARD_PRECISION = 1e12;
    
    event PoolCreated(uint256 indexed poolId, string name, uint256 rewardRate);
    event Staked(address indexed user, uint256 indexed poolId, uint256 amount);
    event Unstaked(address indexed user, uint256 indexed poolId, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed poolId, uint256 amount);
    event PoolUpdated(uint256 indexed poolId, uint256 newRewardRate);
    event HashRateUpdated(uint256 indexed poolId, uint256 newHashRate);
    
    constructor(
        address _miningToken,
        address _oracle,
        address _cbBTC
    ) {
        require(_miningToken != address(0), "MiningPool: invalid mining token");
        require(_oracle != address(0), "MiningPool: invalid oracle");
        require(_cbBTC != address(0), "MiningPool: invalid cbBTC token");
        
        miningToken = cbBTCMiningToken(_miningToken);
        oracle = ChainlinkOracle(_oracle);
        cbBTC = IERC20(_cbBTC);
    }
    
    function createPool(
        string memory name,
        uint256 rewardRate,
        uint256 minimumStake,
        uint256 lockupPeriod
    ) external onlyOwner {
        require(bytes(name).length > 0, "MiningPool: invalid pool name");
        require(rewardRate > 0, "MiningPool: invalid reward rate");
        
        pools[poolCount] = Pool({
            name: name,
            totalHashRate: 0,
            totalStaked: 0,
            rewardRate: rewardRate,
            lastRewardTime: block.timestamp,
            accRewardPerShare: 0,
            active: true,
            minimumStake: minimumStake,
            lockupPeriod: lockupPeriod
        });
        
        emit PoolCreated(poolCount, name, rewardRate);
        poolCount++;
    }
    
    function stake(uint256 poolId, uint256 amount) external nonReentrant whenNotPaused {
        require(poolId < poolCount, "MiningPool: invalid pool ID");
        require(amount > 0, "MiningPool: amount must be greater than 0");
        
        Pool storage pool = pools[poolId];
        require(pool.active, "MiningPool: pool is not active");
        require(amount >= pool.minimumStake, "MiningPool: below minimum stake");
        
        UserInfo storage user = userInfo[poolId][msg.sender];
        
        updatePool(poolId);
        
        if (user.amount > 0) {
            uint256 pendingReward = (user.amount * pool.accRewardPerShare) / REWARD_PRECISION - user.rewardDebt;
            if (pendingReward > 0) {
                miningToken.distributeRewards(msg.sender, pendingReward);
            }
        }
        
        cbBTC.safeTransferFrom(msg.sender, address(this), amount);
        
        user.amount += amount;
        user.stakeTime = block.timestamp;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / REWARD_PRECISION;
        
        pool.totalStaked += amount;
        
        emit Staked(msg.sender, poolId, amount);
    }
    
    function unstake(uint256 poolId, uint256 amount) external nonReentrant whenNotPaused {
        require(poolId < poolCount, "MiningPool: invalid pool ID");
        require(amount > 0, "MiningPool: amount must be greater than 0");
        
        Pool storage pool = pools[poolId];
        UserInfo storage user = userInfo[poolId][msg.sender];
        
        require(user.amount >= amount, "MiningPool: insufficient staked amount");
        require(block.timestamp >= user.stakeTime + pool.lockupPeriod, "MiningPool: lockup period not ended");
        
        updatePool(poolId);
        
        uint256 pendingReward = (user.amount * pool.accRewardPerShare) / REWARD_PRECISION - user.rewardDebt;
        if (pendingReward > 0) {
            miningToken.distributeRewards(msg.sender, pendingReward);
        }
        
        user.amount -= amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / REWARD_PRECISION;
        
        pool.totalStaked -= amount;
        
        cbBTC.safeTransfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, poolId, amount);
    }
    
    function claimRewards(uint256 poolId) external nonReentrant whenNotPaused {
        require(poolId < poolCount, "MiningPool: invalid pool ID");
        
        Pool storage pool = pools[poolId];
        UserInfo storage user = userInfo[poolId][msg.sender];
        
        require(user.amount > 0, "MiningPool: no stake found");
        
        updatePool(poolId);
        
        uint256 pendingReward = (user.amount * pool.accRewardPerShare) / REWARD_PRECISION - user.rewardDebt;
        require(pendingReward > 0, "MiningPool: no pending rewards");
        
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / REWARD_PRECISION;
        user.lastClaimTime = block.timestamp;
        
        miningToken.distributeRewards(msg.sender, pendingReward);
        
        emit RewardsClaimed(msg.sender, poolId, pendingReward);
    }
    
    function updatePool(uint256 poolId) public {
        require(poolId < poolCount, "MiningPool: invalid pool ID");
        
        Pool storage pool = pools[poolId];
        
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }
        
        if (pool.totalStaked == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
        uint256 reward = timeElapsed * pool.rewardRate;
        
        pool.accRewardPerShare += (reward * REWARD_PRECISION) / pool.totalStaked;
        pool.lastRewardTime = block.timestamp;
    }
    
    function getPendingRewards(uint256 poolId, address user) external view returns (uint256) {
        require(poolId < poolCount, "MiningPool: invalid pool ID");
        
        Pool storage pool = pools[poolId];
        UserInfo storage userStake = userInfo[poolId][user];
        
        if (userStake.amount == 0) {
            return 0;
        }
        
        uint256 accRewardPerShare = pool.accRewardPerShare;
        
        if (block.timestamp > pool.lastRewardTime && pool.totalStaked > 0) {
            uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
            uint256 reward = timeElapsed * pool.rewardRate;
            accRewardPerShare += (reward * REWARD_PRECISION) / pool.totalStaked;
        }
        
        return (userStake.amount * accRewardPerShare) / REWARD_PRECISION - userStake.rewardDebt;
    }
    
    function updateHashRate(uint256 poolId, uint256 newHashRate) external onlyOwner {
        require(poolId < poolCount, "MiningPool: invalid pool ID");
        
        Pool storage pool = pools[poolId];
        pool.totalHashRate = newHashRate;
        
        emit HashRateUpdated(poolId, newHashRate);
    }
    
    function updateRewardRate(uint256 poolId, uint256 newRewardRate) external onlyOwner {
        require(poolId < poolCount, "MiningPool: invalid pool ID");
        
        updatePool(poolId);
        
        Pool storage pool = pools[poolId];
        pool.rewardRate = newRewardRate;
        
        emit PoolUpdated(poolId, newRewardRate);
    }
    
    function togglePoolStatus(uint256 poolId) external onlyOwner {
        require(poolId < poolCount, "MiningPool: invalid pool ID");
        
        Pool storage pool = pools[poolId];
        pool.active = !pool.active;
    }
    
    function getPoolInfo(uint256 poolId) external view returns (
        string memory name,
        uint256 totalHashRate,
        uint256 totalStaked,
        uint256 rewardRate,
        bool active,
        uint256 minimumStake,
        uint256 lockupPeriod
    ) {
        require(poolId < poolCount, "MiningPool: invalid pool ID");
        
        Pool storage pool = pools[poolId];
        return (
            pool.name,
            pool.totalHashRate,
            pool.totalStaked,
            pool.rewardRate,
            pool.active,
            pool.minimumStake,
            pool.lockupPeriod
        );
    }
    
    function getUserInfo(uint256 poolId, address user) external view returns (
        uint256 amount,
        uint256 rewardDebt,
        uint256 stakeTime,
        uint256 lastClaimTime
    ) {
        require(poolId < poolCount, "MiningPool: invalid pool ID");
        
        UserInfo storage userStake = userInfo[poolId][user];
        return (
            userStake.amount,
            userStake.rewardDebt,
            userStake.stakeTime,
            userStake.lastClaimTime
        );
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw(uint256 poolId) external nonReentrant {
        require(poolId < poolCount, "MiningPool: invalid pool ID");
        
        UserInfo storage user = userInfo[poolId][msg.sender];
        require(user.amount > 0, "MiningPool: no stake found");
        
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        
        pools[poolId].totalStaked -= amount;
        
        cbBTC.safeTransfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, poolId, amount);
    }
}