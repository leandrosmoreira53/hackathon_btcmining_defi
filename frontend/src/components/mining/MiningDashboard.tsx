import React, { useState, useEffect } from 'react';
import { Web3Service } from '../../services/web3Service';

interface MiningDashboardProps {
  web3Service: Web3Service | null;
  userAddress: string;
}

interface PoolInfo {
  name: string;
  totalHashRate: string;
  totalStaked: string;
  rewardRate: string;
  active: boolean;
  minimumStake: string;
  lockupPeriod: string;
}

interface UserInfo {
  amount: string;
  rewardDebt: string;
  stakeTime: string;
  lastClaimTime: string;
}

export const MiningDashboard: React.FC<MiningDashboardProps> = ({
  web3Service,
  userAddress
}) => {
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [pendingRewards, setPendingRewards] = useState<string>('0');
  const [btcPrice, setBtcPrice] = useState<{ price: string; timestamp: number } | null>(null);
  const [cbBTCBalance, setCbBTCBalance] = useState<string>('0');
  const [miningTokenBalance, setMiningTokenBalance] = useState<string>('0');
  const [unclaimedRewards, setUnclaimedRewards] = useState<string>('0');
  
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const poolId = 0; // Using first pool for this demo

  // Fetch all data
  const fetchData = async () => {
    if (!web3Service || !userAddress) return;

    try {
      setError(null);
      
      // Fetch pool info
      const pool = await web3Service.getPoolInfo(poolId);
      setPoolInfo(pool);
      
      // Fetch user info
      const user = await web3Service.getUserInfo(poolId, userAddress);
      setUserInfo(user);
      
      // Fetch pending rewards
      const pending = await web3Service.getPendingRewards(poolId, userAddress);
      setPendingRewards(pending);
      
      // Fetch BTC price
      const price = await web3Service.getBTCPrice();
      setBtcPrice(price);
      
      // Fetch balances
      const cbBTCBal = await web3Service.getCbBTCBalance(userAddress);
      setCbBTCBalance(cbBTCBal);
      
      const miningBal = await web3Service.getMiningTokenBalance(userAddress);
      setMiningTokenBalance(miningBal);
      
      const unclaimed = await web3Service.getUnclaimedRewards(userAddress);
      setUnclaimedRewards(unclaimed);
      
    } catch (err: any) {
      setError(err.message || 'Failed to fetch mining data');
      console.error('Error fetching mining data:', err);
    }
  };

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [web3Service, userAddress]);

  const handleStake = async () => {
    if (!web3Service || !stakeAmount) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await web3Service.stakeToPool(poolId, stakeAmount);
      setSuccessMessage(`Successfully staked ${stakeAmount} cbBTC!`);
      setStakeAmount('');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to stake');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!web3Service || !unstakeAmount) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await web3Service.unstakeFromPool(poolId, unstakeAmount);
      setSuccessMessage(`Successfully unstaked ${unstakeAmount} cbBTC!`);
      setUnstakeAmount('');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to unstake');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!web3Service) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await web3Service.claimMiningRewards(poolId);
      setSuccessMessage('Successfully claimed mining rewards!');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to claim rewards');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimTokenRewards = async () => {
    if (!web3Service) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await web3Service.claimTokenRewards();
      setSuccessMessage('Successfully claimed token rewards!');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to claim token rewards');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (value: string, decimals: number = 4) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toFixed(decimals);
  };

  const formatTime = (timestamp: string | number) => {
    const date = new Date(parseInt(timestamp.toString()) * 1000);
    return date.toLocaleString();
  };

  if (!web3Service) {
    return (
      <div className=\"mining-dashboard\">
        <div className=\"loading-state\">
          <p>Please connect your wallet to view mining dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className=\"mining-dashboard\">
      <div className=\"dashboard-header\">
        <h2>⛏️ Bitcoin Mining Dashboard</h2>
        <button onClick={fetchData} className=\"refresh-button\">
          🔄 Refresh Data
        </button>
      </div>

      {/* BTC Price */}
      {btcPrice && (
        <div className=\"price-card\">
          <h3>₿ Bitcoin Price</h3>
          <div className=\"price-info\">
            <span className=\"price\">${formatNumber(btcPrice.price, 2)}</span>
            <span className=\"timestamp\">
              Updated: {formatTime(btcPrice.timestamp)}
            </span>
          </div>
        </div>
      )}

      {/* Balances */}
      <div className=\"balances-grid\">
        <div className=\"balance-card\">
          <h4>cbBTC Balance</h4>
          <span className=\"balance\">{formatNumber(cbBTCBalance)} cbBTC</span>
        </div>
        <div className=\"balance-card\">
          <h4>Mining Tokens</h4>
          <span className=\"balance\">{formatNumber(miningTokenBalance)} cbBTCMT</span>
        </div>
        <div className=\"balance-card\">
          <h4>Unclaimed Rewards</h4>
          <span className=\"balance\">{formatNumber(unclaimedRewards)} cbBTCMT</span>
          {parseFloat(unclaimedRewards) > 0 && (
            <button 
              onClick={handleClaimTokenRewards}
              disabled={isLoading}
              className=\"claim-button small\"
            >
              Claim
            </button>
          )}
        </div>
      </div>

      {/* Pool Information */}
      {poolInfo && (
        <div className=\"pool-info-card\">
          <h3>Mining Pool: {poolInfo.name}</h3>
          <div className=\"pool-stats\">
            <div className=\"stat-item\">
              <span className=\"stat-label\">Total Staked:</span>
              <span className=\"stat-value\">{formatNumber(poolInfo.totalStaked)} cbBTC</span>
            </div>
            <div className=\"stat-item\">
              <span className=\"stat-label\">Reward Rate:</span>
              <span className=\"stat-value\">{formatNumber(poolInfo.rewardRate)} tokens/sec</span>
            </div>
            <div className=\"stat-item\">
              <span className=\"stat-label\">Minimum Stake:</span>
              <span className=\"stat-value\">{formatNumber(poolInfo.minimumStake)} cbBTC</span>
            </div>
            <div className=\"stat-item\">
              <span className=\"stat-label\">Lockup Period:</span>
              <span className=\"stat-value\">{parseInt(poolInfo.lockupPeriod) / 86400} days</span>
            </div>
          </div>
        </div>
      )}

      {/* User Staking Info */}
      {userInfo && (
        <div className=\"user-info-card\">
          <h3>Your Staking Position</h3>
          <div className=\"user-stats\">
            <div className=\"stat-item\">
              <span className=\"stat-label\">Staked Amount:</span>
              <span className=\"stat-value\">{formatNumber(userInfo.amount)} cbBTC</span>
            </div>
            <div className=\"stat-item\">
              <span className=\"stat-label\">Pending Rewards:</span>
              <span className=\"stat-value\">{formatNumber(pendingRewards)} cbBTCMT</span>
            </div>
            {userInfo.stakeTime !== '0' && (
              <div className=\"stat-item\">
                <span className=\"stat-label\">Staked Since:</span>
                <span className=\"stat-value\">{formatTime(userInfo.stakeTime)}</span>
              </div>
            )}
          </div>
          
          {parseFloat(pendingRewards) > 0 && (
            <button 
              onClick={handleClaimRewards}
              disabled={isLoading}
              className=\"claim-button\"
            >
              {isLoading ? 'Claiming...' : 'Claim Mining Rewards'}
            </button>
          )}
        </div>
      )}

      {/* Staking Actions */}
      <div className=\"actions-grid\">
        <div className=\"action-card\">
          <h4>Stake cbBTC</h4>
          <div className=\"input-group\">
            <input
              type=\"number\"
              placeholder=\"Amount to stake\"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              min=\"0\"
              step=\"0.0001\"
            />
            <button 
              onClick={handleStake}
              disabled={isLoading || !stakeAmount || parseFloat(stakeAmount) <= 0}
              className=\"action-button stake\"
            >
              {isLoading ? 'Staking...' : 'Stake'}
            </button>
          </div>
          <p className=\"helper-text\">
            Available: {formatNumber(cbBTCBalance)} cbBTC
          </p>
        </div>

        <div className=\"action-card\">
          <h4>Unstake cbBTC</h4>
          <div className=\"input-group\">
            <input
              type=\"number\"
              placeholder=\"Amount to unstake\"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              min=\"0\"
              step=\"0.0001\"
            />
            <button 
              onClick={handleUnstake}
              disabled={isLoading || !unstakeAmount || parseFloat(unstakeAmount) <= 0}
              className=\"action-button unstake\"
            >
              {isLoading ? 'Unstaking...' : 'Unstake'}
            </button>
          </div>
          <p className=\"helper-text\">
            Staked: {userInfo ? formatNumber(userInfo.amount) : '0'} cbBTC
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className=\"message error\">
          <p>❌ {error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className=\"message success\">
          <p>✅ {successMessage}</p>
        </div>
      )}

      <style jsx>{`
        .mining-dashboard {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .dashboard-header h2 {
          margin: 0;
          color: #1f2937;
          font-size: 1.75rem;
          font-weight: 700;
        }
        
        .refresh-button {
          background: #3b82f6;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .refresh-button:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        
        .price-card {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          border-radius: 12px;
          padding: 20px;
          color: white;
        }
        
        .price-card h3 {
          margin: 0 0 12px 0;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .price-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .price {
          font-size: 2rem;
          font-weight: 700;
        }
        
        .timestamp {
          opacity: 0.8;
          font-size: 0.85rem;
        }
        
        .balances-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .balance-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        
        .balance-card h4 {
          margin: 0 0 12px 0;
          color: #6b7280;
          font-size: 0.9rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .balance {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .claim-button {
          background: #10b981;
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .claim-button:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-1px);
        }
        
        .claim-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .claim-button.small {
          padding: 4px 8px;
          font-size: 0.8rem;
        }
        
        .pool-info-card, .user-info-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
        }
        
        .pool-info-card h3, .user-info-card h3 {
          margin: 0 0 20px 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .pool-stats, .user-stats {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
        }
        
        .stat-item:last-child {
          border-bottom: none;
        }
        
        .stat-label {
          color: #6b7280;
          font-weight: 500;
        }
        
        .stat-value {
          color: #1f2937;
          font-weight: 600;
        }
        
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
        }
        
        .action-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
        }
        
        .action-card h4 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .input-group {
          display: flex;
          gap: 12px;
          margin-bottom: 8px;
        }
        
        .input-group input {
          flex: 1;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 1rem;
        }
        
        .input-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .action-button {
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 100px;
        }
        
        .action-button.stake {
          background: #10b981;
          color: white;
        }
        
        .action-button.stake:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-1px);
        }
        
        .action-button.unstake {
          background: #ef4444;
          color: white;
        }
        
        .action-button.unstake:hover:not(:disabled) {
          background: #dc2626;
          transform: translateY(-1px);
        }
        
        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .helper-text {
          margin: 0;
          font-size: 0.85rem;
          color: #6b7280;
        }
        
        .message {
          padding: 16px;
          border-radius: 8px;
          margin-top: 16px;
        }
        
        .message.error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }
        
        .message.success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
        
        .message p {
          margin: 0;
          font-weight: 500;
        }
        
        .loading-state {
          text-align: center;
          padding: 40px;
          color: #6b7280;
        }
        
        @media (max-width: 768px) {
          .mining-dashboard {
            padding: 16px;
          }
          
          .dashboard-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
          
          .actions-grid {
            grid-template-columns: 1fr;
          }
          
          .input-group {
            flex-direction: column;
          }
          
          .balances-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};