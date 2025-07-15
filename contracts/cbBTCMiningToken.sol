// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract cbBTCMiningToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard, Pausable {
    
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10**18; // 1M tokens
    uint256 public constant MAX_SUPPLY = 10000000 * 10**18; // 10M tokens max
    
    mapping(address => bool) public minters;
    mapping(address => uint256) public miningRewards;
    mapping(address => uint256) public lastRewardClaim;
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsDistributed(address indexed user, uint256 amount);
    
    modifier onlyMinter() {
        require(minters[msg.sender], "cbBTCMiningToken: caller is not a minter");
        _;
    }
    
    constructor() ERC20("cbBTC Mining Token", "cbBTCMT") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    function mint(address to, uint256 amount) external onlyMinter whenNotPaused {
        require(totalSupply() + amount <= MAX_SUPPLY, "cbBTCMiningToken: exceeds max supply");
        _mint(to, amount);
    }
    
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "cbBTCMiningToken: invalid minter address");
        minters[minter] = true;
        emit MinterAdded(minter);
    }
    
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    function distributeRewards(address user, uint256 amount) external onlyMinter whenNotPaused {
        require(user != address(0), "cbBTCMiningToken: invalid user address");
        require(amount > 0, "cbBTCMiningToken: amount must be greater than 0");
        
        miningRewards[user] += amount;
        emit RewardsDistributed(user, amount);
    }
    
    function claimRewards() external nonReentrant whenNotPaused {
        uint256 reward = miningRewards[msg.sender];
        require(reward > 0, "cbBTCMiningToken: no rewards to claim");
        
        miningRewards[msg.sender] = 0;
        lastRewardClaim[msg.sender] = block.timestamp;
        
        require(totalSupply() + reward <= MAX_SUPPLY, "cbBTCMiningToken: exceeds max supply");
        _mint(msg.sender, reward);
        
        emit RewardsClaimed(msg.sender, reward);
    }
    
    function getRewards(address user) external view returns (uint256) {
        return miningRewards[user];
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}