// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/IAavePool.sol";

/**
 * @title SecureAaveIntegration
 * @dev Security-hardened contract for Aave V3 integration
 * @notice Implements security patterns from Aave protocol with additional safeguards
 */
contract SecureAaveIntegration is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");
    bytes32 public constant YIELD_MANAGER_ROLE = keccak256("YIELD_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    struct UserDeposit {
        uint256 amount;
        uint256 depositTime;
        uint256 lastYieldClaim;
        uint256 accumulatedYield;
        uint256 dailyWithdrawnAmount;
        uint256 lastWithdrawDay;
        bool frozen;
    }
    
    struct SecurityLimits {
        uint256 maxDailyWithdraw;
        uint256 maxDailyDeposit;
        uint256 maxUserBalance;
        uint256 maxContractBalance;
        uint256 emergencyWithdrawDelay;
    }
    
    IAavePool public immutable aavePool;
    IERC20 public immutable cbBTC;
    IERC20 public immutable aToken;
    
    mapping(address => UserDeposit) public userDeposits;
    mapping(address => bool) public frozenUsers;
    mapping(address => uint256) public lastActionTime;
    
    SecurityLimits public securityLimits;
    
    uint256 public totalDeposited;
    uint256 public totalYieldGenerated;
    uint256 public lastRebalanceTime;
    uint256 public emergencyModeTimestamp;
    
    // Circuit breaker variables
    uint256 public constant CIRCUIT_BREAKER_THRESHOLD = 1000; // 10% in basis points
    uint256 public lastTotalSupply;
    bool public circuitBreakerTriggered;
    
    // Rate limiting
    uint256 public constant RATE_LIMIT_WINDOW = 1 hours;
    uint256 public constant MAX_ACTIONS_PER_WINDOW = 5;
    mapping(address => uint256) public actionCounts;
    mapping(address => uint256) public actionWindows;
    
    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event YieldClaimed(address indexed user, uint256 amount);
    event YieldDistributed(address indexed user, uint256 amount);
    event SecurityAlert(string alertType, address indexed user, uint256 value);
    event UserFrozen(address indexed user, string reason);
    event UserUnfrozen(address indexed user);
    event CircuitBreakerTriggered(uint256 deviation);
    event EmergencyModeActivated();
    
    // Custom errors
    error RateLimitExceeded();
    error UserFrozen();
    error ExceedsLimit();
    error InsufficientBalance();
    error CircuitBreakerActive();
    error EmergencyModeActive();
    error InvalidAmount();
    error UnauthorizedAccess();
    
    modifier rateLimited() {
        _checkRateLimit();
        _;
    }
    
    modifier notFrozen() {
        if (frozenUsers[msg.sender] || userDeposits[msg.sender].frozen) {
            revert UserFrozen();
        }
        _;
    }
    
    modifier circuitBreakerCheck() {
        if (circuitBreakerTriggered) revert CircuitBreakerActive();
        _checkCircuitBreaker();
        _;
    }
    
    modifier emergencyCheck() {
        if (emergencyModeTimestamp > 0 && 
            block.timestamp < emergencyModeTimestamp.add(securityLimits.emergencyWithdrawDelay)) {
            revert EmergencyModeActive();
        }
        _;
    }
    
    constructor(
        address _aavePool,
        address _cbBTC,
        address _aToken,
        address _admin
    ) {
        require(_aavePool != address(0), "Invalid Aave pool");
        require(_cbBTC != address(0), "Invalid cbBTC token");
        require(_aToken != address(0), "Invalid aToken");
        require(_admin != address(0), "Invalid admin");
        
        aavePool = IAavePool(_aavePool);
        cbBTC = IERC20(_cbBTC);
        aToken = IERC20(_aToken);
        
        // Initialize security limits
        securityLimits = SecurityLimits({
            maxDailyWithdraw: 50000e6, // 50,000 USDC
            maxDailyDeposit: 100000e6, // 100,000 USDC
            maxUserBalance: 500000e6, // 500,000 USDC
            maxContractBalance: 5000000e6, // 5M USDC
            emergencyWithdrawDelay: 24 hours
        });
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(DEPOSITOR_ROLE, _admin);
        _grantRole(WITHDRAWER_ROLE, _admin);
        _grantRole(YIELD_MANAGER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
        
        lastRebalanceTime = block.timestamp;
        lastTotalSupply = aToken.totalSupply();
    }
    
    /**
     * @dev Deposit cbBTC to Aave with enhanced security
     * @param amount Amount to deposit
     */
    function depositToAave(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyRole(DEPOSITOR_ROLE)
        notFrozen
        rateLimited
        circuitBreakerCheck
        emergencyCheck
    {
        if (amount == 0) revert InvalidAmount();
        
        UserDeposit storage deposit = userDeposits[msg.sender];
        
        // Security checks
        _checkDailyDepositLimit(msg.sender, amount);
        _checkUserBalanceLimit(msg.sender, amount);
        _checkContractBalanceLimit(amount);
        
        // Update user yield before deposit
        _updateUserYield(msg.sender);
        
        // CHECKS
        require(cbBTC.balanceOf(msg.sender) >= amount, "Insufficient cbBTC balance");
        require(cbBTC.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
        
        // EFFECTS
        deposit.amount = deposit.amount.add(amount);
        deposit.depositTime = block.timestamp;
        totalDeposited = totalDeposited.add(amount);
        
        // Update daily deposit tracking
        uint256 currentDay = block.timestamp.div(86400);
        if (deposit.lastWithdrawDay != currentDay) {
            deposit.dailyWithdrawnAmount = 0;
            deposit.lastWithdrawDay = currentDay;
        }
        
        // INTERACTIONS
        cbBTC.safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve and deposit to Aave
        cbBTC.safeApprove(address(aavePool), amount);
        
        try aavePool.supply(address(cbBTC), amount, address(this), 0) {
            emit Deposited(msg.sender, amount);
        } catch Error(string memory reason) {
            // Revert state changes on Aave failure
            deposit.amount = deposit.amount.sub(amount);
            totalDeposited = totalDeposited.sub(amount);
            
            // Return tokens to user
            cbBTC.safeTransfer(msg.sender, amount);
            
            emit SecurityAlert("AAVE_DEPOSIT_FAILED", msg.sender, amount);
            revert(reason);
        }
    }
    
    /**
     * @dev Withdraw cbBTC from Aave with security checks
     * @param amount Amount to withdraw
     */
    function withdrawFromAave(uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyRole(WITHDRAWER_ROLE)
        notFrozen
        rateLimited
        emergencyCheck
    {
        if (amount == 0) revert InvalidAmount();
        
        UserDeposit storage deposit = userDeposits[msg.sender];
        
        if (deposit.amount < amount) revert InsufficientBalance();
        
        // Security checks
        _checkDailyWithdrawLimit(msg.sender, amount);
        
        // Update user yield before withdrawal
        _updateUserYield(msg.sender);
        
        // EFFECTS
        deposit.amount = deposit.amount.sub(amount);
        totalDeposited = totalDeposited.sub(amount);
        
        // Update daily withdrawal tracking
        uint256 currentDay = block.timestamp.div(86400);
        if (deposit.lastWithdrawDay != currentDay) {
            deposit.dailyWithdrawnAmount = 0;
            deposit.lastWithdrawDay = currentDay;
        }
        deposit.dailyWithdrawnAmount = deposit.dailyWithdrawnAmount.add(amount);
        
        // INTERACTIONS
        try aavePool.withdraw(address(cbBTC), amount, address(this)) returns (uint256 withdrawn) {
            cbBTC.safeTransfer(msg.sender, withdrawn);
            emit Withdrawn(msg.sender, withdrawn);
        } catch Error(string memory reason) {
            // Revert state changes on Aave failure
            deposit.amount = deposit.amount.add(amount);
            totalDeposited = totalDeposited.add(amount);
            deposit.dailyWithdrawnAmount = deposit.dailyWithdrawnAmount.sub(amount);
            
            emit SecurityAlert("AAVE_WITHDRAW_FAILED", msg.sender, amount);
            revert(reason);
        }
    }
    
    /**
     * @dev Claim accumulated yield
     */
    function claimYield() 
        external 
        nonReentrant 
        whenNotPaused 
        notFrozen 
        rateLimited 
    {
        _updateUserYield(msg.sender);
        
        UserDeposit storage deposit = userDeposits[msg.sender];
        
        if (deposit.accumulatedYield == 0) revert("No yield to claim");
        
        uint256 yieldAmount = deposit.accumulatedYield;
        
        // EFFECTS
        deposit.accumulatedYield = 0;
        deposit.lastYieldClaim = block.timestamp;
        
        // INTERACTIONS
        // In a real implementation, this would mint yield tokens or transfer from a yield pool
        emit YieldClaimed(msg.sender, yieldAmount);
    }
    
    /**
     * @dev Update user yield based on aToken balance changes
     * @param user User to update yield for
     */
    function _updateUserYield(address user) internal {
        UserDeposit storage deposit = userDeposits[user];
        
        if (deposit.amount == 0) return;
        
        uint256 currentATokenBalance = aToken.balanceOf(address(this));
        
        if (currentATokenBalance > totalDeposited) {
            uint256 totalYield = currentATokenBalance.sub(totalDeposited);
            uint256 userShare = totalYield.mul(deposit.amount).div(totalDeposited);
            
            deposit.accumulatedYield = deposit.accumulatedYield.add(userShare);
            totalYieldGenerated = totalYieldGenerated.add(userShare);
            
            emit YieldDistributed(user, userShare);
        }
    }
    
    /**
     * @dev Check daily deposit limits
     * @param user User to check
     * @param amount Amount to deposit
     */
    function _checkDailyDepositLimit(address user, uint256 amount) internal view {
        // Implementation would track daily deposit amounts
        // For simplicity, using static limit check
        if (amount > securityLimits.maxDailyDeposit) {
            revert ExceedsLimit();
        }
    }
    
    /**
     * @dev Check daily withdrawal limits
     * @param user User to check
     * @param amount Amount to withdraw
     */
    function _checkDailyWithdrawLimit(address user, uint256 amount) internal view {
        UserDeposit storage deposit = userDeposits[user];
        uint256 currentDay = block.timestamp.div(86400);
        
        uint256 todayWithdrawn = deposit.lastWithdrawDay == currentDay ? 
            deposit.dailyWithdrawnAmount : 0;
            
        if (todayWithdrawn.add(amount) > securityLimits.maxDailyWithdraw) {
            revert ExceedsLimit();
        }
    }
    
    /**
     * @dev Check user balance limits
     * @param user User to check
     * @param amount Amount to add
     */
    function _checkUserBalanceLimit(address user, uint256 amount) internal view {
        UserDeposit storage deposit = userDeposits[user];
        
        if (deposit.amount.add(amount) > securityLimits.maxUserBalance) {
            revert ExceedsLimit();
        }
    }
    
    /**
     * @dev Check contract balance limits
     * @param amount Amount to add
     */
    function _checkContractBalanceLimit(uint256 amount) internal view {
        if (totalDeposited.add(amount) > securityLimits.maxContractBalance) {
            revert ExceedsLimit();
        }
    }
    
    /**
     * @dev Check rate limits
     */
    function _checkRateLimit() internal {
        uint256 currentWindow = block.timestamp.div(RATE_LIMIT_WINDOW);
        
        if (actionWindows[msg.sender] != currentWindow) {
            actionCounts[msg.sender] = 0;
            actionWindows[msg.sender] = currentWindow;
        }
        
        if (actionCounts[msg.sender] >= MAX_ACTIONS_PER_WINDOW) {
            revert RateLimitExceeded();
        }
        
        actionCounts[msg.sender] = actionCounts[msg.sender].add(1);
        lastActionTime[msg.sender] = block.timestamp;
    }
    
    /**
     * @dev Check circuit breaker conditions
     */
    function _checkCircuitBreaker() internal {
        uint256 currentTotalSupply = aToken.totalSupply();
        
        if (lastTotalSupply > 0) {
            uint256 deviation;
            
            if (currentTotalSupply > lastTotalSupply) {
                deviation = currentTotalSupply.sub(lastTotalSupply).mul(10000).div(lastTotalSupply);
            } else {
                deviation = lastTotalSupply.sub(currentTotalSupply).mul(10000).div(lastTotalSupply);
            }
            
            if (deviation > CIRCUIT_BREAKER_THRESHOLD) {
                circuitBreakerTriggered = true;
                _pause();
                emit CircuitBreakerTriggered(deviation);
            }
        }
        
        lastTotalSupply = currentTotalSupply;
    }
    
    // Admin functions
    function freezeUser(address user, string memory reason) external onlyRole(ADMIN_ROLE) {
        frozenUsers[user] = true;
        userDeposits[user].frozen = true;
        emit UserFrozen(user, reason);
    }
    
    function unfreezeUser(address user) external onlyRole(ADMIN_ROLE) {
        frozenUsers[user] = false;
        userDeposits[user].frozen = false;
        emit UserUnfrozen(user);
    }
    
    function resetCircuitBreaker() external onlyRole(ADMIN_ROLE) {
        circuitBreakerTriggered = false;
        lastTotalSupply = aToken.totalSupply();
        _unpause();
    }
    
    function activateEmergencyMode() external onlyRole(EMERGENCY_ROLE) {
        emergencyModeTimestamp = block.timestamp;
        _pause();
        emit EmergencyModeActivated();
    }
    
    function updateSecurityLimits(
        uint256 _maxDailyWithdraw,
        uint256 _maxDailyDeposit,
        uint256 _maxUserBalance,
        uint256 _maxContractBalance
    ) external onlyRole(ADMIN_ROLE) {
        securityLimits.maxDailyWithdraw = _maxDailyWithdraw;
        securityLimits.maxDailyDeposit = _maxDailyDeposit;
        securityLimits.maxUserBalance = _maxUserBalance;
        securityLimits.maxContractBalance = _maxContractBalance;
    }
    
    function emergencyWithdraw(uint256 amount) external onlyRole(EMERGENCY_ROLE) {
        require(emergencyModeTimestamp > 0, "Emergency mode not active");
        
        try aavePool.withdraw(address(cbBTC), amount, address(this)) returns (uint256 withdrawn) {
            cbBTC.safeTransfer(msg.sender, withdrawn);
        } catch {
            // If Aave withdrawal fails, try direct token transfer if available
            uint256 balance = cbBTC.balanceOf(address(this));
            if (balance >= amount) {
                cbBTC.safeTransfer(msg.sender, amount);
            }
        }
    }
    
    // View functions
    function getYieldBalance(address user) external view returns (uint256) {
        UserDeposit storage deposit = userDeposits[user];
        
        if (deposit.amount == 0) return deposit.accumulatedYield;
        
        uint256 currentATokenBalance = aToken.balanceOf(address(this));
        
        if (currentATokenBalance > totalDeposited) {
            uint256 totalYield = currentATokenBalance.sub(totalDeposited);
            uint256 userShare = totalYield.mul(deposit.amount).div(totalDeposited);
            
            return deposit.accumulatedYield.add(userShare);
        }
        
        return deposit.accumulatedYield;
    }
    
    function getUserDepositInfo(address user) external view returns (
        uint256 amount,
        uint256 depositTime,
        uint256 lastYieldClaim,
        uint256 accumulatedYield,
        bool frozen
    ) {
        UserDeposit storage deposit = userDeposits[user];
        return (
            deposit.amount,
            deposit.depositTime,
            deposit.lastYieldClaim,
            deposit.accumulatedYield,
            deposit.frozen
        );
    }
    
    function getTotalStats() external view returns (
        uint256 totalDeposited_,
        uint256 totalYieldGenerated_,
        uint256 currentATokenBalance,
        uint256 contractHealthRatio
    ) {
        uint256 aTokenBalance = aToken.balanceOf(address(this));
        uint256 healthRatio = totalDeposited > 0 ? 
            aTokenBalance.mul(100).div(totalDeposited) : 100;
        
        return (
            totalDeposited,
            totalYieldGenerated,
            aTokenBalance,
            healthRatio
        );
    }
}