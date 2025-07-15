// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SecurityManager is AccessControl, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    
    struct SecurityConfig {
        uint256 maxDailyWithdrawal;     // Maximum daily withdrawal limit
        uint256 maxSingleTransaction;    // Maximum single transaction limit
        uint256 minTimeBetweenActions;   // Minimum time between sensitive actions
        uint256 multiSigThreshold;       // Multi-signature threshold for critical operations
        bool emergencyMode;              // Emergency mode flag
        uint256 lastSecurityUpdate;      // Last security configuration update
    }
    
    struct UserSecurityData {
        uint256 lastActionTime;
        uint256 dailyWithdrawnAmount;
        uint256 lastDailyReset;
        bool isBlacklisted;
        uint256 riskScore;
        uint256 suspiciousActivityCount;
    }
    
    struct TransactionMonitoring {
        uint256 amount;
        address user;
        uint256 timestamp;
        bytes32 actionType;
        bool flagged;
        string reason;
    }
    
    SecurityConfig public securityConfig;
    mapping(address => UserSecurityData) public userSecurityData;
    mapping(bytes32 => bool) public executedTransactions;
    mapping(address => bool) public trustedContracts;
    
    TransactionMonitoring[] public flaggedTransactions;
    address[] public blacklistedAddresses;
    
    uint256 public constant MAX_RISK_SCORE = 100;
    uint256 public constant HIGH_RISK_THRESHOLD = 80;
    uint256 public constant MEDIUM_RISK_THRESHOLD = 50;
    uint256 public constant DAILY_RESET_PERIOD = 24 hours;
    
    event SecurityConfigUpdated(address indexed updater, uint256 timestamp);
    event UserBlacklisted(address indexed user, string reason);
    event UserWhitelisted(address indexed user);
    event SuspiciousActivityDetected(address indexed user, string activity, uint256 riskScore);
    event EmergencyModeActivated(address indexed activator, string reason);
    event EmergencyModeDeactivated(address indexed deactivator);
    event TransactionFlagged(address indexed user, uint256 amount, string reason);
    event SecurityBreachDetected(string breachType, address indexed source);
    
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "SecurityManager: caller is not admin");
        _;
    }
    
    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, msg.sender), "SecurityManager: caller is not operator");
        _;
    }
    
    modifier onlyEmergency() {
        require(hasRole(EMERGENCY_ROLE, msg.sender), "SecurityManager: caller is not emergency responder");
        _;
    }
    
    modifier onlyAuditor() {
        require(hasRole(AUDITOR_ROLE, msg.sender), "SecurityManager: caller is not auditor");
        _;
    }
    
    modifier notInEmergencyMode() {
        require(!securityConfig.emergencyMode, "SecurityManager: system is in emergency mode");
        _;
    }
    
    modifier validUser(address user) {
        require(!userSecurityData[user].isBlacklisted, "SecurityManager: user is blacklisted");
        require(userSecurityData[user].riskScore < HIGH_RISK_THRESHOLD, "SecurityManager: user risk too high");
        _;
    }
    
    modifier rateLimited(address user) {
        UserSecurityData storage userData = userSecurityData[user];
        require(
            block.timestamp >= userData.lastActionTime.add(securityConfig.minTimeBetweenActions),
            "SecurityManager: action rate limited"
        );
        _;
        userData.lastActionTime = block.timestamp;
    }
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(EMERGENCY_ROLE, msg.sender);
        
        // Initialize security configuration
        securityConfig = SecurityConfig({
            maxDailyWithdrawal: 1000 * 1e18,    // 1000 tokens per day
            maxSingleTransaction: 100 * 1e18,   // 100 tokens per transaction
            minTimeBetweenActions: 60,          // 1 minute between actions
            multiSigThreshold: 2,               // 2 signatures for critical operations
            emergencyMode: false,
            lastSecurityUpdate: block.timestamp
        });
    }
    
    function validateTransaction(
        address user,
        uint256 amount,
        bytes32 actionType
    ) external view returns (bool isValid, string memory reason) {
        // Check if system is in emergency mode
        if (securityConfig.emergencyMode) {
            return (false, "System in emergency mode");
        }
        
        // Check if user is blacklisted
        if (userSecurityData[user].isBlacklisted) {
            return (false, "User is blacklisted");
        }
        
        // Check if user has high risk score
        if (userSecurityData[user].riskScore >= HIGH_RISK_THRESHOLD) {
            return (false, "User risk score too high");
        }
        
        // Check single transaction limit
        if (amount > securityConfig.maxSingleTransaction) {
            return (false, "Amount exceeds single transaction limit");
        }
        
        // Check daily withdrawal limit
        UserSecurityData storage userData = userSecurityData[user];
        uint256 dailyAmount = _getDailyWithdrawnAmount(user);
        if (dailyAmount.add(amount) > securityConfig.maxDailyWithdrawal) {
            return (false, "Amount exceeds daily withdrawal limit");
        }
        
        // Check rate limiting
        if (block.timestamp < userData.lastActionTime.add(securityConfig.minTimeBetweenActions)) {
            return (false, "Action rate limited");
        }
        
        return (true, "Transaction validated");
    }
    
    function recordTransaction(
        address user,
        uint256 amount,
        bytes32 actionType
    ) external onlyOperator {
        // Update user security data
        UserSecurityData storage userData = userSecurityData[user];
        userData.lastActionTime = block.timestamp;
        
        // Reset daily amount if needed
        if (block.timestamp >= userData.lastDailyReset.add(DAILY_RESET_PERIOD)) {
            userData.dailyWithdrawnAmount = 0;
            userData.lastDailyReset = block.timestamp;
        }
        
        userData.dailyWithdrawnAmount = userData.dailyWithdrawnAmount.add(amount);
        
        // Analyze transaction for suspicious activity
        _analyzeTransaction(user, amount, actionType);
    }
    
    function _analyzeTransaction(address user, uint256 amount, bytes32 actionType) internal {
        UserSecurityData storage userData = userSecurityData[user];
        bool suspicious = false;
        string memory reason = "";
        
        // Check for large transaction
        if (amount > securityConfig.maxSingleTransaction.mul(70).div(100)) {
            suspicious = true;
            reason = "Large transaction amount";
        }
        
        // Check for rapid consecutive transactions
        if (block.timestamp < userData.lastActionTime.add(30)) {
            suspicious = true;
            reason = "Rapid consecutive transactions";
        }
        
        // Check for unusual patterns (simplified)
        if (userData.dailyWithdrawnAmount > securityConfig.maxDailyWithdrawal.mul(80).div(100)) {
            suspicious = true;
            reason = "High daily activity";
        }
        
        if (suspicious) {
            userData.suspiciousActivityCount = userData.suspiciousActivityCount.add(1);
            userData.riskScore = userData.riskScore.add(10);
            
            if (userData.riskScore > MAX_RISK_SCORE) {
                userData.riskScore = MAX_RISK_SCORE;
            }
            
            // Flag transaction
            flaggedTransactions.push(TransactionMonitoring({
                amount: amount,
                user: user,
                timestamp: block.timestamp,
                actionType: actionType,
                flagged: true,
                reason: reason
            }));
            
            emit SuspiciousActivityDetected(user, reason, userData.riskScore);
            emit TransactionFlagged(user, amount, reason);
            
            // Auto-blacklist if too many suspicious activities
            if (userData.suspiciousActivityCount >= 5) {
                _blacklistUser(user, "Too many suspicious activities");
            }
        }
    }
    
    function _getDailyWithdrawnAmount(address user) internal view returns (uint256) {
        UserSecurityData storage userData = userSecurityData[user];
        
        if (block.timestamp >= userData.lastDailyReset.add(DAILY_RESET_PERIOD)) {
            return 0; // Reset period has passed
        }
        
        return userData.dailyWithdrawnAmount;
    }
    
    function blacklistUser(address user, string memory reason) external onlyAdmin {
        _blacklistUser(user, reason);
    }
    
    function _blacklistUser(address user, string memory reason) internal {
        userSecurityData[user].isBlacklisted = true;
        blacklistedAddresses.push(user);
        emit UserBlacklisted(user, reason);
    }
    
    function whitelistUser(address user) external onlyAdmin {
        userSecurityData[user].isBlacklisted = false;
        userSecurityData[user].riskScore = 0;
        userSecurityData[user].suspiciousActivityCount = 0;
        
        // Remove from blacklisted addresses array
        for (uint256 i = 0; i < blacklistedAddresses.length; i++) {
            if (blacklistedAddresses[i] == user) {
                blacklistedAddresses[i] = blacklistedAddresses[blacklistedAddresses.length - 1];
                blacklistedAddresses.pop();
                break;
            }
        }
        
        emit UserWhitelisted(user);
    }
    
    function activateEmergencyMode(string memory reason) external onlyEmergency {
        securityConfig.emergencyMode = true;
        emit EmergencyModeActivated(msg.sender, reason);
        emit SecurityBreachDetected("Emergency mode activated", msg.sender);
    }
    
    function deactivateEmergencyMode() external onlyAdmin {
        securityConfig.emergencyMode = false;
        emit EmergencyModeDeactivated(msg.sender);
    }
    
    function updateSecurityConfig(
        uint256 maxDailyWithdrawal,
        uint256 maxSingleTransaction,
        uint256 minTimeBetweenActions,
        uint256 multiSigThreshold
    ) external onlyAdmin {
        require(maxDailyWithdrawal > 0, "SecurityManager: invalid daily limit");
        require(maxSingleTransaction > 0, "SecurityManager: invalid transaction limit");
        require(minTimeBetweenActions >= 10, "SecurityManager: minimum time too low");
        require(multiSigThreshold >= 2, "SecurityManager: multisig threshold too low");
        
        securityConfig.maxDailyWithdrawal = maxDailyWithdrawal;
        securityConfig.maxSingleTransaction = maxSingleTransaction;
        securityConfig.minTimeBetweenActions = minTimeBetweenActions;
        securityConfig.multiSigThreshold = multiSigThreshold;
        securityConfig.lastSecurityUpdate = block.timestamp;
        
        emit SecurityConfigUpdated(msg.sender, block.timestamp);
    }
    
    function addTrustedContract(address contractAddress) external onlyAdmin {
        require(contractAddress != address(0), "SecurityManager: invalid contract address");
        trustedContracts[contractAddress] = true;
    }
    
    function removeTrustedContract(address contractAddress) external onlyAdmin {
        trustedContracts[contractAddress] = false;
    }
    
    function getUserRiskProfile(address user) external view returns (
        uint256 riskScore,
        bool isBlacklisted,
        uint256 suspiciousActivityCount,
        uint256 dailyWithdrawnAmount,
        uint256 lastActionTime,
        string memory riskLevel
    ) {
        UserSecurityData storage userData = userSecurityData[user];
        string memory level;
        
        if (userData.riskScore >= HIGH_RISK_THRESHOLD) {
            level = "HIGH";
        } else if (userData.riskScore >= MEDIUM_RISK_THRESHOLD) {
            level = "MEDIUM";
        } else {
            level = "LOW";
        }
        
        return (
            userData.riskScore,
            userData.isBlacklisted,
            userData.suspiciousActivityCount,
            _getDailyWithdrawnAmount(user),
            userData.lastActionTime,
            level
        );
    }
    
    function getFlaggedTransactions() external view onlyAuditor returns (TransactionMonitoring[] memory) {
        return flaggedTransactions;
    }
    
    function getBlacklistedAddresses() external view onlyAuditor returns (address[] memory) {
        return blacklistedAddresses;
    }
    
    function getSecurityMetrics() external view onlyAuditor returns (
        uint256 totalFlaggedTransactions,
        uint256 totalBlacklistedUsers,
        bool emergencyModeActive,
        uint256 lastSecurityUpdate
    ) {
        return (
            flaggedTransactions.length,
            blacklistedAddresses.length,
            securityConfig.emergencyMode,
            securityConfig.lastSecurityUpdate
        );
    }
    
    function performSecurityAudit() external onlyAuditor returns (
        uint256 highRiskUsers,
        uint256 recentSuspiciousActivities,
        uint256 criticalIssues
    ) {
        uint256 highRisk = 0;
        uint256 recentSuspicious = 0;
        uint256 critical = 0;
        
        // Count high-risk users (simplified - in production, iterate through all users)
        // This would require maintaining a list of all users
        
        // Count recent suspicious activities (last 24 hours)
        for (uint256 i = 0; i < flaggedTransactions.length; i++) {
            if (block.timestamp - flaggedTransactions[i].timestamp <= 24 hours) {
                recentSuspicious++;
            }
        }
        
        // Check for critical issues
        if (securityConfig.emergencyMode) {
            critical++;
        }
        
        if (blacklistedAddresses.length > 10) {
            critical++;
        }
        
        return (highRisk, recentSuspicious, critical);
    }
    
    function emergencyWithdraw(address token, uint256 amount) external onlyEmergency {
        require(securityConfig.emergencyMode, "SecurityManager: not in emergency mode");
        IERC20(token).safeTransfer(msg.sender, amount);
    }
    
    function pause() external onlyEmergency {
        _pause();
    }
    
    function unpause() external onlyAdmin {
        _unpause();
    }
    
    function grantRole(bytes32 role, address account) public override onlyAdmin {
        super.grantRole(role, account);
    }
    
    function revokeRole(bytes32 role, address account) public override onlyAdmin {
        super.revokeRole(role, account);
    }
}