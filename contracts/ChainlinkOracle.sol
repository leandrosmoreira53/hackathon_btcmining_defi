// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IChainlinkAggregator.sol";

contract ChainlinkOracle is Ownable, ReentrancyGuard {
    
    IChainlinkAggregator public btcPriceFeed;
    
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public constant STALENESS_THRESHOLD = 3600; // 1 hour
    
    mapping(string => IChainlinkAggregator) public priceFeeds;
    mapping(string => uint256) public lastUpdateTime;
    
    event PriceFeedUpdated(string indexed feedName, address indexed feedAddress);
    event PriceRequested(string indexed feedName, int256 price, uint256 timestamp);
    
    constructor(address _btcPriceFeed) {
        require(_btcPriceFeed != address(0), "ChainlinkOracle: invalid BTC price feed");
        btcPriceFeed = IChainlinkAggregator(_btcPriceFeed);
        priceFeeds["BTC/USD"] = btcPriceFeed;
    }
    
    function getBTCPrice() external view returns (int256 price, uint256 timestamp) {
        return getLatestPrice("BTC/USD");
    }
    
    function getLatestPrice(string memory feedName) public view returns (int256 price, uint256 timestamp) {
        IChainlinkAggregator feed = priceFeeds[feedName];
        require(address(feed) != address(0), "ChainlinkOracle: price feed not found");
        
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();
        
        require(answeredInRound >= roundId, "ChainlinkOracle: stale price data");
        require(updatedAt > 0, "ChainlinkOracle: round not complete");
        require(block.timestamp - updatedAt <= STALENESS_THRESHOLD, "ChainlinkOracle: price data too old");
        
        return (answer, updatedAt);
    }
    
    function getPriceWithDecimals(string memory feedName) external view returns (int256 price, uint8 decimals, uint256 timestamp) {
        IChainlinkAggregator feed = priceFeeds[feedName];
        require(address(feed) != address(0), "ChainlinkOracle: price feed not found");
        
        (int256 rawPrice, uint256 updatedAt) = getLatestPrice(feedName);
        uint8 feedDecimals = feed.decimals();
        
        return (rawPrice, feedDecimals, updatedAt);
    }
    
    function getBTCPriceInWei() external view returns (uint256) {
        (int256 price, ) = getBTCPrice();
        require(price > 0, "ChainlinkOracle: invalid BTC price");
        
        uint8 decimals = btcPriceFeed.decimals();
        uint256 adjustedPrice = uint256(price) * (10 ** (18 - decimals));
        
        return adjustedPrice;
    }
    
    function calculateMiningReward(uint256 hashRate, uint256 duration) external view returns (uint256) {
        require(hashRate > 0, "ChainlinkOracle: invalid hash rate");
        require(duration > 0, "ChainlinkOracle: invalid duration");
        
        (int256 btcPrice, ) = getBTCPrice();
        require(btcPrice > 0, "ChainlinkOracle: invalid BTC price");
        
        // Simplified mining reward calculation
        // In reality, this would be much more complex with difficulty adjustments
        uint256 baseReward = 6.25 * 1e18; // Current BTC block reward
        uint256 avgBlockTime = 600; // 10 minutes in seconds
        uint256 networkHashRate = 400e18; // Approximate network hash rate (400 EH/s)
        
        // Calculate proportional reward based on hash rate and time
        uint256 proportionalReward = (hashRate * duration * baseReward) / (networkHashRate * avgBlockTime);
        
        return proportionalReward;
    }
    
    function addPriceFeed(string memory feedName, address feedAddress) external onlyOwner {
        require(feedAddress != address(0), "ChainlinkOracle: invalid feed address");
        require(bytes(feedName).length > 0, "ChainlinkOracle: invalid feed name");
        
        priceFeeds[feedName] = IChainlinkAggregator(feedAddress);
        lastUpdateTime[feedName] = block.timestamp;
        
        emit PriceFeedUpdated(feedName, feedAddress);
    }
    
    function removePriceFeed(string memory feedName) external onlyOwner {
        require(address(priceFeeds[feedName]) != address(0), "ChainlinkOracle: feed not found");
        
        delete priceFeeds[feedName];
        delete lastUpdateTime[feedName];
    }
    
    function updateBTCPriceFeed(address newFeed) external onlyOwner {
        require(newFeed != address(0), "ChainlinkOracle: invalid feed address");
        
        btcPriceFeed = IChainlinkAggregator(newFeed);
        priceFeeds["BTC/USD"] = btcPriceFeed;
        
        emit PriceFeedUpdated("BTC/USD", newFeed);
    }
    
    function isPriceStale(string memory feedName) external view returns (bool) {
        (, uint256 timestamp) = getLatestPrice(feedName);
        return block.timestamp - timestamp > STALENESS_THRESHOLD;
    }
}