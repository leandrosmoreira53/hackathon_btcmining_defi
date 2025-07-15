// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IAavePool.sol";
import "./cbBTCMiningToken.sol";

contract AaveIntegration is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    struct UserDeposit {
        uint256 amount;
        uint256 depositTime;
        uint256 lastYieldClaim;
        uint256 accumulatedYield;
    }
    
    IAavePool public aavePool;
    IERC20 public cbBTC;
    IERC20 public aToken;
    cbBTCMiningToken public miningToken;
    
    mapping(address => UserDeposit) public userDeposits;
    mapping(address => bool) public authorizedCallers;
    
    uint256 public totalDeposited;
    uint256 public totalYieldGenerated;
    uint256 public constant YIELD_PRECISION = 1e18;
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event YieldClaimed(address indexed user, uint256 amount);
    event YieldDistributed(address indexed user, uint256 amount);
    event AuthorizedCallerUpdated(address indexed caller, bool authorized);
    
    modifier onlyAuthorized() {
        require(authorizedCallers[msg.sender] || msg.sender == owner(), "AaveIntegration: not authorized");
        _;
    }
    
    constructor(
        address _aavePool,
        address _cbBTC,
        address _aToken,
        address _miningToken
    ) {
        require(_aavePool != address(0), "AaveIntegration: invalid Aave pool");
        require(_cbBTC != address(0), "AaveIntegration: invalid cbBTC token");
        require(_aToken != address(0), "AaveIntegration: invalid aToken");
        require(_miningToken != address(0), "AaveIntegration: invalid mining token");
        
        aavePool = IAavePool(_aavePool);
        cbBTC = IERC20(_cbBTC);
        aToken = IERC20(_aToken);
        miningToken = cbBTCMiningToken(_miningToken);
    }
    
    function depositToAave(uint256 amount) external onlyAuthorized nonReentrant whenNotPaused {
        require(amount > 0, "AaveIntegration: amount must be greater than 0");
        
        UserDeposit storage deposit = userDeposits[msg.sender];
        
        // Update yield before new deposit
        updateUserYield(msg.sender);
        
        // Transfer cbBTC from user
        cbBTC.safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve and deposit to Aave
        cbBTC.safeApprove(address(aavePool), amount);
        aavePool.supply(address(cbBTC), amount, address(this), 0);
        
        // Update user deposit info
        deposit.amount += amount;
        deposit.depositTime = block.timestamp;
        
        totalDeposited += amount;
        
        emit Deposited(msg.sender, amount);
    }
    
    function withdrawFromAave(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "AaveIntegration: amount must be greater than 0");
        
        UserDeposit storage deposit = userDeposits[msg.sender];
        require(deposit.amount >= amount, "AaveIntegration: insufficient balance");
        
        // Update yield before withdrawal
        updateUserYield(msg.sender);
        
        // Withdraw from Aave
        uint256 withdrawn = aavePool.withdraw(address(cbBTC), amount, address(this));
        
        // Update user deposit info
        deposit.amount -= amount;
        totalDeposited -= amount;
        
        // Transfer cbBTC to user
        cbBTC.safeTransfer(msg.sender, withdrawn);
        
        emit Withdrawn(msg.sender, amount);
    }
    
    function claimYield() external nonReentrant whenNotPaused {
        updateUserYield(msg.sender);
        
        UserDeposit storage deposit = userDeposits[msg.sender];
        require(deposit.accumulatedYield > 0, "AaveIntegration: no yield to claim");
        
        uint256 yieldAmount = deposit.accumulatedYield;
        deposit.accumulatedYield = 0;
        deposit.lastYieldClaim = block.timestamp;
        
        // Distribute yield as mining tokens
        miningToken.distributeRewards(msg.sender, yieldAmount);
        
        emit YieldClaimed(msg.sender, yieldAmount);
    }
    
    function updateUserYield(address user) public {
        UserDeposit storage deposit = userDeposits[user];
        
        if (deposit.amount == 0) {
            return;
        }
        
        uint256 currentATokenBalance = aToken.balanceOf(address(this));
        uint256 expectedBalance = totalDeposited;
        
        if (currentATokenBalance > expectedBalance) {
            uint256 totalYield = currentATokenBalance - expectedBalance;
            uint256 userShare = (totalYield * deposit.amount) / totalDeposited;
            
            deposit.accumulatedYield += userShare;
            totalYieldGenerated += userShare;
            
            emit YieldDistributed(user, userShare);
        }
    }
    
    function getYieldBalance(address user) external view returns (uint256) {
        UserDeposit storage deposit = userDeposits[user];
        
        if (deposit.amount == 0) {
            return deposit.accumulatedYield;
        }
        
        uint256 currentATokenBalance = aToken.balanceOf(address(this));
        uint256 expectedBalance = totalDeposited;
        
        if (currentATokenBalance > expectedBalance) {
            uint256 totalYield = currentATokenBalance - expectedBalance;
            uint256 userShare = (totalYield * deposit.amount) / totalDeposited;
            
            return deposit.accumulatedYield + userShare;
        }
        
        return deposit.accumulatedYield;
    }
    
    function getUserDepositInfo(address user) external view returns (
        uint256 amount,
        uint256 depositTime,
        uint256 lastYieldClaim,
        uint256 accumulatedYield
    ) {
        UserDeposit storage deposit = userDeposits[user];
        return (
            deposit.amount,
            deposit.depositTime,
            deposit.lastYieldClaim,
            deposit.accumulatedYield
        );
    }
    
    function getAaveAccountData() external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    ) {
        return aavePool.getUserAccountData(address(this));
    }
    
    function getReserveData() external view returns (
        uint256 configuration,
        uint128 liquidityIndex,
        uint128 currentLiquidityRate,
        uint128 variableBorrowIndex,
        uint128 currentVariableBorrowRate,
        uint128 currentStableBorrowRate,
        uint40 lastUpdateTimestamp
    ) {
        (
            uint256 config,
            uint128 liqIndex,
            uint128 currentLiqRate,
            uint128 varBorrowIndex,
            uint128 currentVarBorrowRate,
            uint128 currentStableBorrowRate,
            uint40 lastUpdate,
            ,,,,,
        ) = aavePool.getReserveData(address(cbBTC));
        
        return (
            config,
            liqIndex,
            currentLiqRate,
            varBorrowIndex,
            currentVarBorrowRate,
            currentStableBorrowRate,
            lastUpdate
        );
    }
    
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        require(caller != address(0), "AaveIntegration: invalid caller address");
        authorizedCallers[caller] = authorized;
        emit AuthorizedCallerUpdated(caller, authorized);
    }
    
    function updateAavePool(address newAavePool) external onlyOwner {
        require(newAavePool != address(0), "AaveIntegration: invalid Aave pool");
        aavePool = IAavePool(newAavePool);
    }
    
    function updateAToken(address newAToken) external onlyOwner {
        require(newAToken != address(0), "AaveIntegration: invalid aToken");
        aToken = IERC20(newAToken);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = cbBTC.balanceOf(address(this));
        if (balance > 0) {
            cbBTC.safeTransfer(owner(), balance);
        }
        
        uint256 aTokenBalance = aToken.balanceOf(address(this));
        if (aTokenBalance > 0) {
            aavePool.withdraw(address(cbBTC), type(uint256).max, owner());
        }
    }
    
    function getTotalStats() external view returns (
        uint256 totalDeposited_,
        uint256 totalYieldGenerated_,
        uint256 currentATokenBalance,
        uint256 estimatedAPY
    ) {
        uint256 aTokenBalance = aToken.balanceOf(address(this));
        uint256 estimatedAPY = 0;
        
        if (totalDeposited > 0 && totalYieldGenerated > 0) {
            // Simple APY calculation based on historical yield
            estimatedAPY = (totalYieldGenerated * 365 * 24 * 3600 * 100) / (totalDeposited * (block.timestamp - 1));
        }
        
        return (
            totalDeposited,
            totalYieldGenerated,
            aTokenBalance,
            estimatedAPY
        );
    }
}