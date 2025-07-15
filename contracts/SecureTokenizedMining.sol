// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/IChainlinkAggregator.sol";

/**
 * @title SecureTokenizedMining
 * @dev Security-hardened contract for tokenizing Bitcoin mining operations
 * @notice Implements defense-in-depth security patterns from Aave and Uniswap
 */
contract SecureTokenizedMining is 
    ERC721, 
    ERC721Enumerable, 
    AccessControl, 
    ReentrancyGuard, 
    Pausable 
{
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant YIELD_MANAGER_ROLE = keccak256("YIELD_MANAGER_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // Business Model Parameters (immutable for security)
    uint256 public constant PRECO_INICIAL_TH = 35e6; // US$35 per TH (6 decimals USDC)
    uint256 public constant LUCRO_DIARIO_BASE = 75000; // US$0.075 per TH per day (6 decimals USDC)
    uint256 public constant ENTRADA_MINIMA_TH = 18; // 18 TH minimum
    uint256 public constant ENTRADA_MAXIMA_TH = 50; // 50 TH maximum per transaction
    uint256 public constant TOTAL_HASHRATE = 216; // 216 TH/s total
    
    // Security parameters
    uint256 public constant MAX_DAILY_CLAIMS_PER_USER = 5;
    uint256 public constant RATE_LIMIT_WINDOW = 1 hours;
    uint256 public constant MAX_ACTIONS_PER_WINDOW = 10;
    uint256 public constant PRICE_STALENESS_THRESHOLD = 3600; // 1 hour
    uint256 public constant MIN_BTC_PRICE = 10000e8; // $10,000 (8 decimals)
    uint256 public constant MAX_BTC_PRICE = 500000e8; // $500,000 (8 decimals)
    uint256 public constant MAX_PRICE_DEVIATION = 1000; // 10% (basis points)
    
    struct MiningPosition {
        uint256 thAmount;
        uint256 purchasePrice;
        uint256 purchaseTime;
        uint256 totalEarned;
        uint256 lastClaimTime;
        uint256 defiEarnings;
        bool active;
        uint256 dailyClaimCount;
        uint256 lastClaimDay;
    }
    
    struct UserRateLimit {
        uint256 actionCount;
        uint256 lastActionTime;
        uint256 lastWindow;
    }
    
    IERC20 public immutable usdc;
    IChainlinkAggregator public immutable btcPriceFeed;
    
    mapping(uint256 => MiningPosition) public positions;
    mapping(address => uint256[]) public userPositions;
    mapping(address => UserRateLimit) public rateLimits;
    mapping(string => int256) public lastValidPrices;
    
    uint256 private _tokenIdCounter = 1;
    uint256 public totalThSold;
    uint256 public totalUsdcCollected;
    uint256 public totalUsdcDistributed;
    
    // Emergency controls
    bool public emergencyStop = false;
    uint256 public emergencyStopTime;
    uint256 public maxContractBalance = 10000000e6; // 10M USDC max
    
    // Events
    event PositionCreated(uint256 indexed tokenId, address indexed owner, uint256 thAmount, uint256 priceUsdc);
    event EarningsClaimed(uint256 indexed tokenId, address indexed owner, uint256 miningEarnings, uint256 defiEarnings);
    event DefiEarningsDistributed(uint256 indexed tokenId, uint256 amount);
    event EmergencyStop(uint256 timestamp);
    event EmergencyStopRemoved(uint256 timestamp);
    event SecurityAlert(string alertType, address user, uint256 value);
    
    // Custom errors for gas efficiency
    error InvalidTHAmount();
    error InsufficientBalance();
    error RateLimitExceeded();
    error EmergencyModeActive();
    error InvalidPrice();
    error UnauthorizedAccess();
    error PositionNotActive();
    error DailyClaimLimitExceeded();
    
    modifier notInEmergency() {
        if (emergencyStop) revert EmergencyModeActive();
        _;
    }
    
    modifier rateLimited() {
        _checkRateLimit();
        _;
    }
    
    modifier validTHAmount(uint256 thAmount) {
        if (thAmount < ENTRADA_MINIMA_TH || thAmount > ENTRADA_MAXIMA_TH) {
            revert InvalidTHAmount();
        }
        _;
    }
    
    modifier onlyTokenOwner(uint256 tokenId) {
        if (ownerOf(tokenId) != msg.sender) revert UnauthorizedAccess();
        _;
    }
    
    constructor(
        address _usdc,
        address _btcPriceFeed,
        address _admin
    ) ERC721("Secure Tokenized Mining", "STM") {
        require(_usdc != address(0), "Invalid USDC address");
        require(_btcPriceFeed != address(0), "Invalid BTC price feed");
        require(_admin != address(0), "Invalid admin address");
        
        usdc = IERC20(_usdc);
        btcPriceFeed = IChainlinkAggregator(_btcPriceFeed);
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(YIELD_MANAGER_ROLE, _admin);
        _grantRole(EMERGENCY_ROLE, _admin);
    }
    
    /**
     * @dev Purchase mining position with enhanced security checks
     * @param thAmount Amount of TH to purchase
     */
    function purchaseMiningPosition(uint256 thAmount) 
        external 
        nonReentrant 
        whenNotPaused 
        notInEmergency
        rateLimited
        validTHAmount(thAmount)
    {
        // Check total hashrate availability
        if (totalThSold.add(thAmount) > TOTAL_HASHRATE) {
            revert InvalidTHAmount();
        }
        
        uint256 totalCost = _calculatePurchaseCostSafe(thAmount);
        
        // Check user balance
        if (usdc.balanceOf(msg.sender) < totalCost) {
            revert InsufficientBalance();
        }
        
        // Check contract balance limits
        if (usdc.balanceOf(address(this)).add(totalCost) > maxContractBalance) {
            emit SecurityAlert("CONTRACT_BALANCE_LIMIT", msg.sender, totalCost);
            revert("Contract balance limit exceeded");
        }
        
        // CHECKS-EFFECTS-INTERACTIONS pattern
        
        // Effects: Update state before external calls
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter = _tokenIdCounter.add(1);
        
        positions[tokenId] = MiningPosition({
            thAmount: thAmount,
            purchasePrice: totalCost,
            purchaseTime: block.timestamp,
            totalEarned: 0,
            lastClaimTime: block.timestamp,
            defiEarnings: 0,
            active: true,
            dailyClaimCount: 0,
            lastClaimDay: _getCurrentDay()
        });
        
        userPositions[msg.sender].push(tokenId);
        totalThSold = totalThSold.add(thAmount);
        totalUsdcCollected = totalUsdcCollected.add(totalCost);
        
        // Interactions: External calls last
        usdc.safeTransferFrom(msg.sender, address(this), totalCost);
        _safeMint(msg.sender, tokenId);
        
        emit PositionCreated(tokenId, msg.sender, thAmount, totalCost);
    }
    
    /**
     * @dev Claim earnings with enhanced security and rate limiting
     * @param tokenId Token ID to claim earnings for
     */
    function claimEarnings(uint256 tokenId) 
        external 
        nonReentrant 
        whenNotPaused
        notInEmergency
        onlyTokenOwner(tokenId)
        rateLimited
    {
        MiningPosition storage position = positions[tokenId];
        
        if (!position.active) revert PositionNotActive();
        
        // Daily claim limit check
        uint256 currentDay = _getCurrentDay();
        if (position.lastClaimDay == currentDay) {
            if (position.dailyClaimCount >= MAX_DAILY_CLAIMS_PER_USER) {
                revert DailyClaimLimitExceeded();
            }
        } else {
            position.dailyClaimCount = 0;
            position.lastClaimDay = currentDay;
        }
        
        // Calculate earnings
        (uint256 miningEarnings, uint256 defiEarnings) = _calculatePendingEarnings(tokenId);
        uint256 totalEarnings = miningEarnings.add(defiEarnings);
        
        require(totalEarnings > 0, "No earnings to claim");
        
        // Check contract has sufficient balance
        if (usdc.balanceOf(address(this)) < totalEarnings) {
            revert InsufficientBalance();
        }
        
        // EFFECTS: Update state before external call
        position.totalEarned = position.totalEarned.add(totalEarnings);
        position.lastClaimTime = block.timestamp;
        position.defiEarnings = 0;
        position.dailyClaimCount = position.dailyClaimCount.add(1);
        totalUsdcDistributed = totalUsdcDistributed.add(totalEarnings);
        
        // INTERACTIONS: External call last
        usdc.safeTransfer(msg.sender, totalEarnings);
        
        emit EarningsClaimed(tokenId, msg.sender, miningEarnings, defiEarnings);
    }
    
    /**
     * @dev Distribute DeFi earnings with access control
     * @param tokenId Token ID to distribute earnings to
     * @param amount Amount of DeFi earnings to distribute
     */
    function distributeDefiEarnings(uint256 tokenId, uint256 amount) 
        external 
        onlyRole(YIELD_MANAGER_ROLE)
        whenNotPaused
        notInEmergency
    {
        require(_exists(tokenId), "Token does not exist");
        require(positions[tokenId].active, "Position not active");
        require(amount > 0, "Amount must be positive");
        
        positions[tokenId].defiEarnings = positions[tokenId].defiEarnings.add(amount);
        
        emit DefiEarningsDistributed(tokenId, amount);
    }
    
    /**
     * @dev Get BTC price with enhanced validation
     * @return price BTC price with validation
     * @return timestamp Price update timestamp
     */
    function getBTCPrice() external view returns (int256 price, uint256 timestamp) {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = btcPriceFeed.latestRoundData();
        
        // Chainlink validation
        require(answeredInRound >= roundId, "Stale price data");
        require(updatedAt > 0, "Round not complete");
        require(block.timestamp.sub(updatedAt) <= PRICE_STALENESS_THRESHOLD, "Price too old");
        
        // Price bounds validation
        require(answer >= MIN_BTC_PRICE, "Price below minimum threshold");
        require(answer <= MAX_BTC_PRICE, "Price above maximum threshold");
        
        // Price deviation check
        int256 lastPrice = lastValidPrices["BTC/USD"];
        if (lastPrice > 0) {
            uint256 deviation = _calculateDeviation(answer, lastPrice);
            require(deviation <= MAX_PRICE_DEVIATION, "Price deviation too high");
        }
        
        return (answer, updatedAt);
    }
    
    /**
     * @dev Calculate purchase cost with overflow protection
     * @param thAmount Amount of TH
     * @return cost Total cost in USDC
     */
    function _calculatePurchaseCostSafe(uint256 thAmount) internal pure returns (uint256) {
        require(thAmount > 0, "TH amount must be positive");
        require(thAmount <= ENTRADA_MAXIMA_TH, "TH amount too large");
        
        uint256 cost = thAmount.mul(PRECO_INICIAL_TH);
        require(cost.div(thAmount) == PRECO_INICIAL_TH, "Overflow detected");
        
        return cost;
    }
    
    /**
     * @dev Calculate pending earnings for a position
     * @param tokenId Token ID
     * @return miningEarnings Mining earnings
     * @return defiEarnings DeFi earnings
     */
    function _calculatePendingEarnings(uint256 tokenId) 
        internal 
        view 
        returns (uint256 miningEarnings, uint256 defiEarnings) 
    {
        MiningPosition storage position = positions[tokenId];
        
        if (position.active) {
            uint256 daysSinceLastClaim = block.timestamp.sub(position.lastClaimTime).div(86400);
            miningEarnings = position.thAmount.mul(LUCRO_DIARIO_BASE).mul(daysSinceLastClaim);
            defiEarnings = position.defiEarnings;
        }
    }
    
    /**
     * @dev Check rate limits for user actions
     */
    function _checkRateLimit() internal {
        UserRateLimit storage limit = rateLimits[msg.sender];
        uint256 currentWindow = block.timestamp.div(RATE_LIMIT_WINDOW);
        
        if (currentWindow > limit.lastWindow) {
            limit.actionCount = 0;
            limit.lastWindow = currentWindow;
        }
        
        if (limit.actionCount >= MAX_ACTIONS_PER_WINDOW) {
            revert RateLimitExceeded();
        }
        
        limit.actionCount = limit.actionCount.add(1);
        limit.lastActionTime = block.timestamp;
    }
    
    /**
     * @dev Calculate price deviation in basis points
     * @param newPrice New price
     * @param oldPrice Old price
     * @return deviation Deviation in basis points
     */
    function _calculateDeviation(int256 newPrice, int256 oldPrice) internal pure returns (uint256) {
        if (oldPrice == 0) return 0;
        
        int256 difference = newPrice > oldPrice ? newPrice - oldPrice : oldPrice - newPrice;
        return uint256(difference.mul(10000).div(oldPrice));
    }
    
    /**
     * @dev Get current day for rate limiting
     * @return day Current day number
     */
    function _getCurrentDay() internal view returns (uint256) {
        return block.timestamp.div(86400);
    }
    
    // Emergency functions
    function triggerEmergencyStop() external onlyRole(EMERGENCY_ROLE) {
        emergencyStop = true;
        emergencyStopTime = block.timestamp;
        _pause();
        emit EmergencyStop(block.timestamp);
    }
    
    function removeEmergencyStop() external onlyRole(EMERGENCY_ROLE) {
        require(block.timestamp >= emergencyStopTime.add(24 hours), "Must wait 24 hours");
        emergencyStop = false;
        _unpause();
        emit EmergencyStopRemoved(block.timestamp);
    }
    
    // Admin functions
    function setMaxContractBalance(uint256 _maxBalance) external onlyRole(ADMIN_ROLE) {
        require(_maxBalance >= totalUsdcCollected, "Cannot set below current balance");
        maxContractBalance = _maxBalance;
    }
    
    function updateLastValidPrice(string memory pair, int256 price) external onlyRole(OPERATOR_ROLE) {
        lastValidPrices[pair] = price;
    }
    
    function deactivatePosition(uint256 tokenId) external onlyRole(ADMIN_ROLE) {
        require(_exists(tokenId), "Token does not exist");
        positions[tokenId].active = false;
    }
    
    function emergencyWithdraw(uint256 amount) external onlyRole(EMERGENCY_ROLE) {
        require(emergencyStop, "Only during emergency");
        require(amount <= usdc.balanceOf(address(this)), "Insufficient balance");
        usdc.safeTransfer(msg.sender, amount);
    }
    
    // View functions
    function getPendingEarnings(uint256 tokenId) 
        external 
        view 
        returns (uint256 miningEarnings, uint256 defiEarnings) 
    {
        require(_exists(tokenId), "Token does not exist");
        return _calculatePendingEarnings(tokenId);
    }
    
    function getPositionDetails(uint256 tokenId) external view returns (
        uint256 thAmount,
        uint256 purchasePrice,
        uint256 purchaseTime,
        uint256 totalEarned,
        uint256 lastClaimTime,
        uint256 defiEarnings,
        bool active,
        uint256 currentROI,
        uint256 daysHeld
    ) {
        require(_exists(tokenId), "Token does not exist");
        
        MiningPosition storage position = positions[tokenId];
        
        thAmount = position.thAmount;
        purchasePrice = position.purchasePrice;
        purchaseTime = position.purchaseTime;
        totalEarned = position.totalEarned;
        lastClaimTime = position.lastClaimTime;
        defiEarnings = position.defiEarnings;
        active = position.active;
        
        daysHeld = block.timestamp.sub(position.purchaseTime).div(86400);
        
        if (position.purchasePrice > 0) {
            currentROI = position.totalEarned.add(position.defiEarnings).mul(100).div(position.purchasePrice);
        }
    }
    
    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }
    
    function getContractStats() external view returns (
        uint256 totalThSold_,
        uint256 totalUsdcCollected_,
        uint256 totalUsdcDistributed_,
        uint256 availableThForSale,
        uint256 contractUsdcBalance
    ) {
        return (
            totalThSold,
            totalUsdcCollected,
            totalUsdcDistributed,
            TOTAL_HASHRATE.sub(totalThSold),
            usdc.balanceOf(address(this))
        );
    }
    
    // Required overrides
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}