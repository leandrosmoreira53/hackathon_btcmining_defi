// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./MiningPool.sol";
import "./ProofOfReserve.sol";
import "./AutoReinvestment.sol";

interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata checkData) external returns (bool upkeepNeeded, bytes memory performData);
    function performUpkeep(bytes calldata performData) external;
}

contract ChainlinkAutomation is Ownable, ReentrancyGuard, Pausable, AutomationCompatibleInterface {
    
    enum TaskType {
        DAILY_DISTRIBUTION,
        PROOF_OF_RESERVE_UPDATE,
        AUTO_REINVESTMENT,
        AAVE_YIELD_HARVEST,
        PERFORMANCE_MONITORING
    }
    
    struct AutomationTask {
        TaskType taskType;
        uint256 lastExecution;
        uint256 interval;
        bool enabled;
        uint256 executionCount;
        uint256 maxGasLimit;
    }
    
    struct PerformanceMetrics {
        uint256 totalExecutions;
        uint256 successfulExecutions;
        uint256 failedExecutions;
        uint256 totalGasUsed;
        uint256 lastExecutionTime;
        string lastError;
    }
    
    MiningPool public miningPool;
    ProofOfReserve public proofOfReserve;
    AutoReinvestment public autoReinvestment;
    
    mapping(TaskType => AutomationTask) public automationTasks;
    mapping(TaskType => PerformanceMetrics) public taskMetrics;
    
    address[] public eligibleReinvestmentUsers;
    mapping(address => bool) public isEligibleForReinvestment;
    
    uint256 public constant DAILY_INTERVAL = 24 * 60 * 60; // 24 hours
    uint256 public constant HOURLY_INTERVAL = 60 * 60; // 1 hour
    uint256 public constant PROOF_OF_RESERVE_INTERVAL = 6 * 60 * 60; // 6 hours
    uint256 public constant REINVESTMENT_INTERVAL = 24 * 60 * 60; // 24 hours
    
    event AutomationTaskExecuted(TaskType indexed taskType, bool success, uint256 gasUsed);
    event AutomationTaskUpdated(TaskType indexed taskType, bool enabled, uint256 interval);
    event ReinvestmentUserAdded(address indexed user);
    event ReinvestmentUserRemoved(address indexed user);
    event AutomationError(TaskType indexed taskType, string error);
    
    constructor(
        address _miningPool,
        address _proofOfReserve,
        address _autoReinvestment
    ) {
        require(_miningPool != address(0), "ChainlinkAutomation: invalid mining pool");
        require(_proofOfReserve != address(0), "ChainlinkAutomation: invalid proof of reserve");
        require(_autoReinvestment != address(0), "ChainlinkAutomation: invalid auto reinvestment");
        
        miningPool = MiningPool(_miningPool);
        proofOfReserve = ProofOfReserve(_proofOfReserve);
        autoReinvestment = AutoReinvestment(_autoReinvestment);
        
        _initializeAutomationTasks();
    }
    
    function _initializeAutomationTasks() internal {
        // Daily cbBTC distribution
        automationTasks[TaskType.DAILY_DISTRIBUTION] = AutomationTask({
            taskType: TaskType.DAILY_DISTRIBUTION,
            lastExecution: block.timestamp,
            interval: DAILY_INTERVAL,
            enabled: true,
            executionCount: 0,
            maxGasLimit: 500000
        });
        
        // Proof of Reserve updates (every 6 hours)
        automationTasks[TaskType.PROOF_OF_RESERVE_UPDATE] = AutomationTask({
            taskType: TaskType.PROOF_OF_RESERVE_UPDATE,
            lastExecution: block.timestamp,
            interval: PROOF_OF_RESERVE_INTERVAL,
            enabled: true,
            executionCount: 0,
            maxGasLimit: 300000
        });
        
        // Auto-reinvestment execution (daily)
        automationTasks[TaskType.AUTO_REINVESTMENT] = AutomationTask({
            taskType: TaskType.AUTO_REINVESTMENT,
            lastExecution: block.timestamp,
            interval: REINVESTMENT_INTERVAL,
            enabled: true,
            executionCount: 0,
            maxGasLimit: 1000000
        });
        
        // Aave yield harvesting (daily)
        automationTasks[TaskType.AAVE_YIELD_HARVEST] = AutomationTask({
            taskType: TaskType.AAVE_YIELD_HARVEST,
            lastExecution: block.timestamp,
            interval: DAILY_INTERVAL,
            enabled: true,
            executionCount: 0,
            maxGasLimit: 400000
        });
        
        // Performance monitoring (hourly)
        automationTasks[TaskType.PERFORMANCE_MONITORING] = AutomationTask({
            taskType: TaskType.PERFORMANCE_MONITORING,
            lastExecution: block.timestamp,
            interval: HOURLY_INTERVAL,
            enabled: true,
            executionCount: 0,
            maxGasLimit: 200000
        });
    }
    
    function checkUpkeep(bytes calldata checkData) external view override returns (bool upkeepNeeded, bytes memory performData) {
        // Check all automation tasks to see if any need execution
        TaskType[] memory tasksToExecute = new TaskType[](5);
        uint256 taskCount = 0;
        
        for (uint256 i = 0; i < 5; i++) {
            TaskType taskType = TaskType(i);
            AutomationTask storage task = automationTasks[taskType];
            
            if (task.enabled && block.timestamp >= task.lastExecution + task.interval) {
                tasksToExecute[taskCount] = taskType;
                taskCount++;
            }
        }
        
        if (taskCount > 0) {
            // Encode tasks to execute
            bytes memory tasksData = abi.encode(tasksToExecute, taskCount);
            return (true, tasksData);
        }
        
        return (false, "");
    }
    
    function performUpkeep(bytes calldata performData) external override {
        (TaskType[] memory tasksToExecute, uint256 taskCount) = abi.decode(performData, (TaskType[], uint256));
        
        for (uint256 i = 0; i < taskCount; i++) {
            TaskType taskType = tasksToExecute[i];
            AutomationTask storage task = automationTasks[taskType];
            
            // Double-check that task still needs execution
            if (task.enabled && block.timestamp >= task.lastExecution + task.interval) {
                _executeTask(taskType);
            }
        }
    }
    
    function _executeTask(TaskType taskType) internal {
        uint256 gasStart = gasleft();
        bool success = false;
        string memory errorMessage = "";
        
        try this._executeTaskInternal(taskType) {
            success = true;
        } catch Error(string memory reason) {
            errorMessage = reason;
        } catch (bytes memory) {
            errorMessage = "Unknown error occurred";
        }
        
        uint256 gasUsed = gasStart - gasleft();
        
        // Update task metrics
        AutomationTask storage task = automationTasks[taskType];
        PerformanceMetrics storage metrics = taskMetrics[taskType];
        
        task.lastExecution = block.timestamp;
        task.executionCount++;
        
        metrics.totalExecutions++;
        metrics.totalGasUsed += gasUsed;
        metrics.lastExecutionTime = block.timestamp;
        
        if (success) {
            metrics.successfulExecutions++;
        } else {
            metrics.failedExecutions++;
            metrics.lastError = errorMessage;
            emit AutomationError(taskType, errorMessage);
        }
        
        emit AutomationTaskExecuted(taskType, success, gasUsed);
    }
    
    function _executeTaskInternal(TaskType taskType) external {
        require(msg.sender == address(this), "ChainlinkAutomation: internal function");
        
        if (taskType == TaskType.DAILY_DISTRIBUTION) {
            _executeDailyDistribution();
        } else if (taskType == TaskType.PROOF_OF_RESERVE_UPDATE) {
            _executeProofOfReserveUpdate();
        } else if (taskType == TaskType.AUTO_REINVESTMENT) {
            _executeAutoReinvestment();
        } else if (taskType == TaskType.AAVE_YIELD_HARVEST) {
            _executeAaveYieldHarvest();
        } else if (taskType == TaskType.PERFORMANCE_MONITORING) {
            _executePerformanceMonitoring();
        }
    }
    
    function _executeDailyDistribution() internal {
        // Execute daily cbBTC reward distribution
        miningPool.distributeDailyCbBTCRewards();
    }
    
    function _executeProofOfReserveUpdate() internal {
        // This would typically call external APIs to update proof of reserve
        // For now, we'll simulate with mock data
        
        string[] memory poolIds = proofOfReserve.getAllPoolIds();
        
        for (uint256 i = 0; i < poolIds.length; i++) {
            // In production, this would fetch real data from mining pool APIs
            uint256 mockBTCBalance = 150000000; // 1.5 BTC in satoshis
            uint256 mockHashrate = 216000000000000; // 216 TH/s in H/s
            uint256 mockBlockHeight = block.number; // Mock block height
            
            proofOfReserve.updateReserveData(
                poolIds[i],
                mockBTCBalance,
                mockHashrate,
                mockBlockHeight
            );
        }
    }
    
    function _executeAutoReinvestment() internal {
        // Execute auto-reinvestment for eligible users
        address[] memory users = new address[](eligibleReinvestmentUsers.length);
        for (uint256 i = 0; i < eligibleReinvestmentUsers.length; i++) {
            users[i] = eligibleReinvestmentUsers[i];
        }
        
        if (users.length > 0) {
            autoReinvestment.bulkExecuteReinvestments(users);
        }
    }
    
    function _executeAaveYieldHarvest() internal {
        // Claim Aave yield for the mining pool
        miningPool.claimAaveYield();
        
        // Auto-deposit a portion to Aave if conditions are met
        miningPool.autoDepositToAave(0); // Pool ID 0 as example
    }
    
    function _executePerformanceMonitoring() internal {
        // Update total hashrate staked
        miningPool.updateTotalHashrateStaked();
        
        // Check system health metrics
        // This could include checking contract balances, gas prices, etc.
    }
    
    function addReinvestmentUser(address user) external onlyOwner {
        require(user != address(0), "ChainlinkAutomation: invalid user address");
        require(!isEligibleForReinvestment[user], "ChainlinkAutomation: user already added");
        
        eligibleReinvestmentUsers.push(user);
        isEligibleForReinvestment[user] = true;
        
        emit ReinvestmentUserAdded(user);
    }
    
    function removeReinvestmentUser(address user) external onlyOwner {
        require(isEligibleForReinvestment[user], "ChainlinkAutomation: user not found");
        
        // Find and remove user from array
        for (uint256 i = 0; i < eligibleReinvestmentUsers.length; i++) {
            if (eligibleReinvestmentUsers[i] == user) {
                eligibleReinvestmentUsers[i] = eligibleReinvestmentUsers[eligibleReinvestmentUsers.length - 1];
                eligibleReinvestmentUsers.pop();
                break;
            }
        }
        
        isEligibleForReinvestment[user] = false;
        
        emit ReinvestmentUserRemoved(user);
    }
    
    function updateTaskConfiguration(
        TaskType taskType,
        bool enabled,
        uint256 interval,
        uint256 maxGasLimit
    ) external onlyOwner {
        require(interval >= 300, "ChainlinkAutomation: interval too short"); // Minimum 5 minutes
        require(maxGasLimit >= 100000, "ChainlinkAutomation: gas limit too low");
        require(maxGasLimit <= 2000000, "ChainlinkAutomation: gas limit too high");
        
        AutomationTask storage task = automationTasks[taskType];
        task.enabled = enabled;
        task.interval = interval;
        task.maxGasLimit = maxGasLimit;
        
        emit AutomationTaskUpdated(taskType, enabled, interval);
    }
    
    function manualExecuteTask(TaskType taskType) external onlyOwner {
        require(automationTasks[taskType].enabled, "ChainlinkAutomation: task not enabled");
        _executeTask(taskType);
    }
    
    function getTaskInfo(TaskType taskType) external view returns (
        uint256 lastExecution,
        uint256 interval,
        bool enabled,
        uint256 executionCount,
        uint256 maxGasLimit,
        uint256 nextExecution
    ) {
        AutomationTask storage task = automationTasks[taskType];
        return (
            task.lastExecution,
            task.interval,
            task.enabled,
            task.executionCount,
            task.maxGasLimit,
            task.lastExecution + task.interval
        );
    }
    
    function getTaskMetrics(TaskType taskType) external view returns (
        uint256 totalExecutions,
        uint256 successfulExecutions,
        uint256 failedExecutions,
        uint256 totalGasUsed,
        uint256 lastExecutionTime,
        string memory lastError
    ) {
        PerformanceMetrics storage metrics = taskMetrics[taskType];
        return (
            metrics.totalExecutions,
            metrics.successfulExecutions,
            metrics.failedExecutions,
            metrics.totalGasUsed,
            metrics.lastExecutionTime,
            metrics.lastError
        );
    }
    
    function getEligibleReinvestmentUsers() external view returns (address[] memory) {
        return eligibleReinvestmentUsers;
    }
    
    function getSystemStatus() external view returns (
        bool allTasksEnabled,
        uint256 totalSuccessfulExecutions,
        uint256 totalFailedExecutions,
        uint256 totalGasConsumed
    ) {
        bool allEnabled = true;
        uint256 totalSuccessful = 0;
        uint256 totalFailed = 0;
        uint256 totalGas = 0;
        
        for (uint256 i = 0; i < 5; i++) {
            TaskType taskType = TaskType(i);
            if (!automationTasks[taskType].enabled) {
                allEnabled = false;
            }
            
            PerformanceMetrics storage metrics = taskMetrics[taskType];
            totalSuccessful += metrics.successfulExecutions;
            totalFailed += metrics.failedExecutions;
            totalGas += metrics.totalGasUsed;
        }
        
        return (allEnabled, totalSuccessful, totalFailed, totalGas);
    }
    
    function emergencyPauseTask(TaskType taskType) external onlyOwner {
        automationTasks[taskType].enabled = false;
        emit AutomationTaskUpdated(taskType, false, automationTasks[taskType].interval);
    }
    
    function emergencyPauseAllTasks() external onlyOwner {
        for (uint256 i = 0; i < 5; i++) {
            TaskType taskType = TaskType(i);
            automationTasks[taskType].enabled = false;
            emit AutomationTaskUpdated(taskType, false, automationTasks[taskType].interval);
        }
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
}