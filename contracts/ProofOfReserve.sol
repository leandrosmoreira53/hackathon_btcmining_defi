// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IChainlinkAggregator.sol";

contract ProofOfReserve is Ownable, ReentrancyGuard, Pausable {
    
    struct ReserveData {
        uint256 btcBalance;           // BTC balance in satoshis
        uint256 hashrateActive;      // Active hashrate in TH/s
        uint256 timestamp;           // Last update timestamp
        bool verified;               // Verification status
        string poolAddress;          // Mining pool address/identifier
        uint256 blockHeight;         // BTC block height at time of proof
    }
    
    struct PoolPerformance {
        uint256 totalHashrate;       // Total pool hashrate
        uint256 actualHashrate;      // Actual measured hashrate
        uint256 efficiency;          // Efficiency percentage (0-100)
        uint256 uptime;             // Uptime percentage (0-100)
        uint256 lastBlockFound;      // Timestamp of last block found
        uint256 blocksFound24h;      // Blocks found in last 24h
    }
    
    mapping(string => ReserveData) public reserves;        // Pool ID => Reserve Data
    mapping(string => PoolPerformance) public performance; // Pool ID => Performance Data
    mapping(address => bool) public authorizedOracles;     // Authorized oracle addresses
    
    string[] public poolIds;                               // Array of all pool IDs
    uint256 public constant STALENESS_THRESHOLD = 3600;   // 1 hour
    uint256 public constant MIN_EFFICIENCY = 85;          // 85% minimum efficiency
    uint256 public constant MIN_UPTIME = 95;              // 95% minimum uptime
    
    event ReserveUpdated(string indexed poolId, uint256 btcBalance, uint256 hashrate, uint256 timestamp);
    event PerformanceUpdated(string indexed poolId, uint256 efficiency, uint256 uptime);
    event OracleAuthorized(address indexed oracle, bool status);
    event ReserveVerificationFailed(string indexed poolId, string reason);
    event PoolAdded(string indexed poolId, string poolAddress);
    
    modifier onlyAuthorizedOracle() {
        require(authorizedOracles[msg.sender] || msg.sender == owner(), "ProofOfReserve: not authorized oracle");
        _;
    }
    
    modifier validPoolId(string memory poolId) {
        require(bytes(reserves[poolId].poolAddress).length > 0, "ProofOfReserve: pool not found");
        _;
    }
    
    constructor() {}
    
    function addPool(string memory poolId, string memory poolAddress) external onlyOwner {
        require(bytes(poolId).length > 0, "ProofOfReserve: invalid pool ID");
        require(bytes(poolAddress).length > 0, "ProofOfReserve: invalid pool address");
        require(bytes(reserves[poolId].poolAddress).length == 0, "ProofOfReserve: pool already exists");
        
        reserves[poolId] = ReserveData({
            btcBalance: 0,
            hashrateActive: 0,
            timestamp: 0,
            verified: false,
            poolAddress: poolAddress,
            blockHeight: 0
        });
        
        performance[poolId] = PoolPerformance({
            totalHashrate: 0,
            actualHashrate: 0,
            efficiency: 0,
            uptime: 0,
            lastBlockFound: 0,
            blocksFound24h: 0
        });
        
        poolIds.push(poolId);
        emit PoolAdded(poolId, poolAddress);
    }
    
    function updateReserveData(
        string memory poolId,
        uint256 btcBalance,
        uint256 hashrateActive,
        uint256 blockHeight
    ) external onlyAuthorizedOracle validPoolId(poolId) {
        require(btcBalance >= 0, "ProofOfReserve: invalid BTC balance");
        require(hashrateActive > 0, "ProofOfReserve: invalid hashrate");
        require(blockHeight > reserves[poolId].blockHeight, "ProofOfReserve: block height must increase");
        
        ReserveData storage reserve = reserves[poolId];
        
        reserve.btcBalance = btcBalance;
        reserve.hashrateActive = hashrateActive;
        reserve.timestamp = block.timestamp;
        reserve.blockHeight = blockHeight;
        reserve.verified = _verifyReserveData(poolId);
        
        emit ReserveUpdated(poolId, btcBalance, hashrateActive, block.timestamp);
        
        if (!reserve.verified) {
            emit ReserveVerificationFailed(poolId, "Reserve verification failed");
        }
    }
    
    function updatePerformanceData(
        string memory poolId,
        uint256 totalHashrate,
        uint256 actualHashrate,
        uint256 efficiency,
        uint256 uptime,
        uint256 blocksFound24h
    ) external onlyAuthorizedOracle validPoolId(poolId) {
        require(efficiency <= 100, "ProofOfReserve: invalid efficiency");
        require(uptime <= 100, "ProofOfReserve: invalid uptime");
        require(actualHashrate <= totalHashrate, "ProofOfReserve: actual hashrate exceeds total");
        
        PoolPerformance storage perf = performance[poolId];
        
        perf.totalHashrate = totalHashrate;
        perf.actualHashrate = actualHashrate;
        perf.efficiency = efficiency;
        perf.uptime = uptime;
        perf.blocksFound24h = blocksFound24h;
        
        if (blocksFound24h > 0) {
            perf.lastBlockFound = block.timestamp;
        }
        
        emit PerformanceUpdated(poolId, efficiency, uptime);
        
        // Re-verify reserves after performance update
        reserves[poolId].verified = _verifyReserveData(poolId);
    }
    
    function _verifyReserveData(string memory poolId) internal view returns (bool) {
        ReserveData storage reserve = reserves[poolId];
        PoolPerformance storage perf = performance[poolId];
        
        // Check data freshness
        if (block.timestamp - reserve.timestamp > STALENESS_THRESHOLD) {
            return false;
        }
        
        // Check minimum performance requirements
        if (perf.efficiency < MIN_EFFICIENCY || perf.uptime < MIN_UPTIME) {
            return false;
        }
        
        // Check if hashrate is reasonable (actual vs reported)
        if (perf.actualHashrate < (perf.totalHashrate * MIN_EFFICIENCY / 100)) {
            return false;
        }
        
        // Check if there's recent mining activity (found blocks in last 24h)
        if (perf.blocksFound24h == 0 && block.timestamp - perf.lastBlockFound > 1 days) {
            return false;
        }
        
        return true;
    }
    
    function getReserveData(string memory poolId) external view validPoolId(poolId) returns (
        uint256 btcBalance,
        uint256 hashrateActive,
        uint256 timestamp,
        bool verified,
        string memory poolAddress,
        uint256 blockHeight
    ) {
        ReserveData storage reserve = reserves[poolId];
        return (
            reserve.btcBalance,
            reserve.hashrateActive,
            reserve.timestamp,
            reserve.verified,
            reserve.poolAddress,
            reserve.blockHeight
        );
    }
    
    function getPerformanceData(string memory poolId) external view validPoolId(poolId) returns (
        uint256 totalHashrate,
        uint256 actualHashrate,
        uint256 efficiency,
        uint256 uptime,
        uint256 lastBlockFound,
        uint256 blocksFound24h
    ) {
        PoolPerformance storage perf = performance[poolId];
        return (
            perf.totalHashrate,
            perf.actualHashrate,
            perf.efficiency,
            perf.uptime,
            perf.lastBlockFound,
            perf.blocksFound24h
        );
    }
    
    function getTotalVerifiedHashrate() external view returns (uint256) {
        uint256 totalVerified = 0;
        
        for (uint256 i = 0; i < poolIds.length; i++) {
            string memory poolId = poolIds[i];
            if (reserves[poolId].verified) {
                totalVerified += reserves[poolId].hashrateActive;
            }
        }
        
        return totalVerified;
    }
    
    function getTotalVerifiedBTCBalance() external view returns (uint256) {
        uint256 totalBTC = 0;
        
        for (uint256 i = 0; i < poolIds.length; i++) {
            string memory poolId = poolIds[i];
            if (reserves[poolId].verified) {
                totalBTC += reserves[poolId].btcBalance;
            }
        }
        
        return totalBTC;
    }
    
    function isReserveDataFresh(string memory poolId) external view validPoolId(poolId) returns (bool) {
        return block.timestamp - reserves[poolId].timestamp <= STALENESS_THRESHOLD;
    }
    
    function getAllPoolIds() external view returns (string[] memory) {
        return poolIds;
    }
    
    function getVerifiedPools() external view returns (string[] memory) {
        uint256 verifiedCount = 0;
        
        // Count verified pools
        for (uint256 i = 0; i < poolIds.length; i++) {
            if (reserves[poolIds[i]].verified) {
                verifiedCount++;
            }
        }
        
        // Create array of verified pools
        string[] memory verifiedPools = new string[](verifiedCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < poolIds.length; i++) {
            if (reserves[poolIds[i]].verified) {
                verifiedPools[index] = poolIds[i];
                index++;
            }
        }
        
        return verifiedPools;
    }
    
    function setAuthorizedOracle(address oracle, bool authorized) external onlyOwner {
        require(oracle != address(0), "ProofOfReserve: invalid oracle address");
        authorizedOracles[oracle] = authorized;
        emit OracleAuthorized(oracle, authorized);
    }
    
    function updateMinRequirements(uint256 minEfficiency, uint256 minUptime) external onlyOwner {
        require(minEfficiency <= 100, "ProofOfReserve: invalid efficiency");
        require(minUptime <= 100, "ProofOfReserve: invalid uptime");
        
        // Note: This would require making MIN_EFFICIENCY and MIN_UPTIME non-constant
        // For now, this is a placeholder for future implementation
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function emergencyRemovePool(string memory poolId) external onlyOwner {
        require(bytes(reserves[poolId].poolAddress).length > 0, "ProofOfReserve: pool not found");
        
        delete reserves[poolId];
        delete performance[poolId];
        
        // Remove from poolIds array
        for (uint256 i = 0; i < poolIds.length; i++) {
            if (keccak256(bytes(poolIds[i])) == keccak256(bytes(poolId))) {
                poolIds[i] = poolIds[poolIds.length - 1];
                poolIds.pop();
                break;
            }
        }
    }
}