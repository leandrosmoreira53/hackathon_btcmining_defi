// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IChainlinkAggregator.sol";

contract TokenizedMining is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // Business Model Parameters
    uint256 public constant PRECO_INICIAL_TH = 35e6; // US$35 per TH (6 decimals USDC)
    uint256 public constant LUCRO_DIARIO_BASE = 75000; // US$0.075 per TH per day (6 decimals USDC)
    uint256 public constant MARKUP_PERCENTUAL = 5; // 5%
    uint256 public constant ENTRADA_MINIMA_TH = 18; // 18 TH minimum
    uint256 public constant ENTRADA_MINIMA_USD = 700e6; // US$700 (6 decimals USDC)
    uint256 public constant ROI_ANUAL = 77; // 77%
    uint256 public constant BREAKEVEN_DIAS = 466; // 15.5 months * 30 days
    uint256 public constant BREAKEVEN_DEFI_DIAS = 408; // 13.6 months * 30 days
    uint256 public constant REINVESTIMENTO_DEFI_DIARIO = 500000; // US$0.50 per day (6 decimals USDC)
    
    // Equipment Specifications
    string public constant EQUIPMENT_MODEL = "Bitmain Antminer S21+";
    uint256 public constant TOTAL_HASHRATE = 216; // 216 TH/s
    uint256 public constant POWER_CONSUMPTION = 3510; // 3,510W
    uint256 public constant EQUIPMENT_COST = 7170e6; // US$7,170 (6 decimals USDC)
    
    struct MiningPosition {
        uint256 thAmount; // Amount of TH owned
        uint256 purchasePrice; // Purchase price in USDC
        uint256 purchaseTime; // Time of purchase
        uint256 totalEarned; // Total USDC earned
        uint256 lastClaimTime; // Last claim timestamp
        uint256 defiEarnings; // DeFi earnings accumulated
        bool active; // Position active status
    }
    
    IERC20 public usdc;
    IChainlinkAggregator public btcPriceFeed;
    
    mapping(uint256 => MiningPosition) public positions;
    mapping(address => uint256[]) public userPositions;
    
    uint256 private _tokenIdCounter = 1;
    uint256 public totalThSold;
    uint256 public totalUsdcCollected;
    uint256 public totalUsdcDistributed;
    
    event PositionCreated(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 thAmount,
        uint256 priceUsdc
    );
    
    event EarningsClaimed(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 miningEarnings,
        uint256 defiEarnings
    );
    
    event DefiEarningsDistributed(
        uint256 indexed tokenId,
        uint256 amount
    );
    
    constructor(
        address _usdc,
        address _btcPriceFeed
    ) ERC721("Tokenized Mining Position", "TMP") {
        require(_usdc != address(0), "Invalid USDC address");
        require(_btcPriceFeed != address(0), "Invalid BTC price feed");
        
        usdc = IERC20(_usdc);
        btcPriceFeed = IChainlinkAggregator(_btcPriceFeed);
    }
    
    function purchaseMiningPosition(uint256 thAmount) external nonReentrant whenNotPaused {
        require(thAmount >= ENTRADA_MINIMA_TH, "Below minimum TH amount");
        require(totalThSold + thAmount <= TOTAL_HASHRATE, "Exceeds total hashrate available");
        
        uint256 totalCost = calculatePurchaseCost(thAmount);
        require(usdc.balanceOf(msg.sender) >= totalCost, "Insufficient USDC balance");
        
        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), totalCost);
        
        // Create new position
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);
        
        positions[tokenId] = MiningPosition({
            thAmount: thAmount,
            purchasePrice: totalCost,
            purchaseTime: block.timestamp,
            totalEarned: 0,
            lastClaimTime: block.timestamp,
            defiEarnings: 0,
            active: true
        });
        
        userPositions[msg.sender].push(tokenId);
        totalThSold += thAmount;
        totalUsdcCollected += totalCost;
        
        emit PositionCreated(tokenId, msg.sender, thAmount, totalCost);
    }
    
    function claimEarnings(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(positions[tokenId].active, "Position not active");
        
        MiningPosition storage position = positions[tokenId];
        
        // Calculate mining earnings
        uint256 daysSinceLastClaim = (block.timestamp - position.lastClaimTime) / 86400;
        uint256 miningEarnings = position.thAmount * LUCRO_DIARIO_BASE * daysSinceLastClaim;
        
        // Add pending DeFi earnings
        uint256 defiEarnings = position.defiEarnings;
        
        uint256 totalEarnings = miningEarnings + defiEarnings;
        
        if (totalEarnings > 0) {
            require(usdc.balanceOf(address(this)) >= totalEarnings, "Insufficient contract balance");
            
            // Update position
            position.totalEarned += totalEarnings;
            position.lastClaimTime = block.timestamp;
            position.defiEarnings = 0;
            
            totalUsdcDistributed += totalEarnings;
            
            // Transfer earnings
            usdc.safeTransfer(msg.sender, totalEarnings);
            
            emit EarningsClaimed(tokenId, msg.sender, miningEarnings, defiEarnings);
        }
    }
    
    function distributeDefiEarnings(uint256 tokenId, uint256 amount) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        require(positions[tokenId].active, "Position not active");
        
        positions[tokenId].defiEarnings += amount;
        
        emit DefiEarningsDistributed(tokenId, amount);
    }
    
    function calculatePurchaseCost(uint256 thAmount) public pure returns (uint256) {
        return thAmount * PRECO_INICIAL_TH;
    }
    
    function calculateDailyEarnings(uint256 thAmount) public pure returns (uint256) {
        return thAmount * LUCRO_DIARIO_BASE;
    }
    
    function calculateMonthlyEarnings(uint256 thAmount) public pure returns (uint256) {
        return calculateDailyEarnings(thAmount) * 30;
    }
    
    function calculateAnnualROI(uint256 thAmount) public pure returns (uint256) {
        uint256 annualEarnings = calculateDailyEarnings(thAmount) * 365;
        uint256 investment = calculatePurchaseCost(thAmount);
        return (annualEarnings * 100) / investment;
    }
    
    function calculateBreakevenDays(uint256 thAmount, bool withDefi) public pure returns (uint256) {
        uint256 investment = calculatePurchaseCost(thAmount);
        uint256 dailyEarnings = calculateDailyEarnings(thAmount);
        
        if (withDefi) {
            dailyEarnings += REINVESTIMENTO_DEFI_DIARIO;
        }
        
        return investment / dailyEarnings;
    }
    
    function getPendingEarnings(uint256 tokenId) external view returns (uint256 miningEarnings, uint256 defiEarnings) {
        require(_exists(tokenId), "Token does not exist");
        
        MiningPosition storage position = positions[tokenId];
        
        if (position.active) {
            uint256 daysSinceLastClaim = (block.timestamp - position.lastClaimTime) / 86400;
            miningEarnings = position.thAmount * LUCRO_DIARIO_BASE * daysSinceLastClaim;
            defiEarnings = position.defiEarnings;
        }
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
        
        daysHeld = (block.timestamp - position.purchaseTime) / 86400;
        
        if (position.purchasePrice > 0) {
            currentROI = ((position.totalEarned + position.defiEarnings) * 100) / position.purchasePrice;
        }
    }
    
    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }
    
    function getBusinessParameters() external pure returns (
        uint256 precoInicialTh,
        uint256 lucroDiarioBase,
        uint256 entradaMinimaTh,
        uint256 entradaMinimaUsd,
        uint256 roiAnual,
        uint256 breakevenDias,
        uint256 breakevenDefiDias,
        uint256 reinvestimentoDefiDiario
    ) {
        return (
            PRECO_INICIAL_TH,
            LUCRO_DIARIO_BASE,
            ENTRADA_MINIMA_TH,
            ENTRADA_MINIMA_USD,
            ROI_ANUAL,
            BREAKEVEN_DIAS,
            BREAKEVEN_DEFI_DIAS,
            REINVESTIMENTO_DEFI_DIARIO
        );
    }
    
    function getEquipmentSpecs() external pure returns (
        string memory model,
        uint256 totalHashrate,
        uint256 powerConsumption,
        uint256 equipmentCost
    ) {
        return (
            EQUIPMENT_MODEL,
            TOTAL_HASHRATE,
            POWER_CONSUMPTION,
            EQUIPMENT_COST
        );
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
            TOTAL_HASHRATE - totalThSold,
            usdc.balanceOf(address(this))
        );
    }
    
    function getBTCPrice() external view returns (int256 price, uint256 timestamp) {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = btcPriceFeed.latestRoundData();
        
        require(answeredInRound >= roundId, "Stale price data");
        require(updatedAt > 0, "Round not complete");
        
        return (answer, updatedAt);
    }
    
    function deactivatePosition(uint256 tokenId) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        positions[tokenId].active = false;
    }
    
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount <= usdc.balanceOf(address(this)), "Insufficient balance");
        usdc.safeTransfer(owner(), amount);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Override required functions
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
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}