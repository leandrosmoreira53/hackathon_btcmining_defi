import React, { useState, useEffect } from 'react';
import { Web3Service } from '../../services/web3Service';

interface MiningDashboardCompleteProps {
  web3Service: Web3Service | null;
  userAddress: string;
}

interface UserStats {
  totalStaked: number;
  totalHashrate: number;
  pendingRewards: number;
  pendingCbBTCRewards: number;
  aaveYield: number;
  totalEarned: number;
  dailyRewards: number;
  monthlyProjection: number;
}

interface ReinvestmentPlan {
  enabled: boolean;
  percentage: number;
  totalReinvested: number;
  additionalHashrate: number;
}

export const MiningDashboardComplete: React.FC<MiningDashboardCompleteProps> = ({
  web3Service,
  userAddress
}) => {
  const [userStats, setUserStats] = useState<UserStats>({
    totalStaked: 0,
    totalHashrate: 0,
    pendingRewards: 0,
    pendingCbBTCRewards: 0,
    aaveYield: 0,
    totalEarned: 0,
    dailyRewards: 0,
    monthlyProjection: 0
  });
  
  const [reinvestmentPlan, setReinvestmentPlan] = useState<ReinvestmentPlan>({
    enabled: false,
    percentage: 0,
    totalReinvested: 0,
    additionalHashrate: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'aave' | 'reinvest'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load user data
  useEffect(() => {
    if (web3Service && userAddress) {
      loadUserData();
      const interval = setInterval(loadUserData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [web3Service, userAddress]);

  const loadUserData = async () => {
    if (!web3Service) return;
    
    try {
      // Simulate loading user mining data
      const mockStats: UserStats = {
        totalStaked: 1.5, // 1.5 cbBTC
        totalHashrate: 40, // 40 TH/s
        pendingRewards: 0.025, // 0.025 mining tokens
        pendingCbBTCRewards: 0.002, // 0.002 cbBTC
        aaveYield: 0.001, // 0.001 cbBTC
        totalEarned: 0.15, // Total earned so far
        dailyRewards: 0.003, // Daily rewards
        monthlyProjection: 0.09 // Monthly projection
      };
      
      const mockReinvestment: ReinvestmentPlan = {
        enabled: true,
        percentage: 60,
        totalReinvested: 0.08,
        additionalHashrate: 4.5
      };
      
      setUserStats(mockStats);
      setReinvestmentPlan(mockReinvestment);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleClaimMiningRewards = async () => {
    if (!web3Service) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Simulate claiming mining rewards
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(`Successfully claimed ${userStats.pendingRewards.toFixed(4)} mining tokens!`);
      
      // Update stats
      setUserStats(prev => ({
        ...prev,
        pendingRewards: 0,
        totalEarned: prev.totalEarned + prev.pendingRewards
      }));
    } catch (error: any) {
      setError(error.message || 'Failed to claim mining rewards');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimCbBTCRewards = async () => {
    if (!web3Service) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Simulate claiming cbBTC rewards
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(`Successfully claimed ${userStats.pendingCbBTCRewards.toFixed(4)} cbBTC!`);
      
      // Update stats
      setUserStats(prev => ({
        ...prev,
        pendingCbBTCRewards: 0,
        totalEarned: prev.totalEarned + prev.pendingCbBTCRewards
      }));
    } catch (error: any) {
      setError(error.message || 'Failed to claim cbBTC rewards');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimAaveYield = async () => {
    if (!web3Service) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Simulate claiming Aave yield
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(`Successfully claimed ${userStats.aaveYield.toFixed(4)} cbBTC from Aave!`);
      
      // Update stats
      setUserStats(prev => ({
        ...prev,
        aaveYield: 0,
        totalEarned: prev.totalEarned + prev.aaveYield
      }));
    } catch (error: any) {
      setError(error.message || 'Failed to claim Aave yield');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimAllRewards = async () => {
    if (!web3Service) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Simulate claiming all rewards
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const totalClaimed = userStats.pendingRewards + userStats.pendingCbBTCRewards + userStats.aaveYield;
      setSuccess(`Successfully claimed all rewards! Total: ${totalClaimed.toFixed(4)} tokens`);
      
      // Update stats
      setUserStats(prev => ({
        ...prev,
        pendingRewards: 0,
        pendingCbBTCRewards: 0,
        aaveYield: 0,
        totalEarned: prev.totalEarned + totalClaimed
      }));
    } catch (error: any) {
      setError(error.message || 'Failed to claim all rewards');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepositToAave = async () => {
    if (!web3Service) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Simulate depositing to Aave
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const depositAmount = userStats.pendingCbBTCRewards;
      setSuccess(`Successfully deposited ${depositAmount.toFixed(4)} cbBTC to Aave for yield farming!`);
      
      // Update stats
      setUserStats(prev => ({
        ...prev,
        pendingCbBTCRewards: 0
      }));
    } catch (error: any) {
      setError(error.message || 'Failed to deposit to Aave');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateReinvestment = async (percentage: number) => {
    if (!web3Service) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Simulate updating reinvestment plan
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setReinvestmentPlan(prev => ({
        ...prev,
        enabled: percentage > 0,
        percentage
      }));
      
      setSuccess(`Reinvestment plan updated: ${percentage}% auto-reinvestment ${percentage > 0 ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      setError(error.message || 'Failed to update reinvestment plan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mining-dashboard-complete">
      {/* Header Stats */}
      <div className="dashboard-header">
        <div className="stat-cards">
          <div className="stat-card primary">
            <div className="stat-icon">⚡</div>
            <div className="stat-info">
              <span className="stat-label">Total Hashrate</span>
              <span className="stat-value">{userStats.totalHashrate.toFixed(1)} TH/s</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-label">Daily Rewards</span>
              <span className="stat-value">${(userStats.dailyRewards * 50000).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <span className="stat-label">Total Earned</span>
              <span className="stat-value">${(userStats.totalEarned * 50000).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-info">
              <span className="stat-label">Monthly Projection</span>
              <span className="stat-value">${(userStats.monthlyProjection * 50000).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'rewards' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewards')}
        >
          Claim Rewards
        </button>
        <button 
          className={`tab-btn ${activeTab === 'aave' ? 'active' : ''}`}
          onClick={() => setActiveTab('aave')}
        >
          Aave DeFi
        </button>
        <button 
          className={`tab-btn ${activeTab === 'reinvest' ? 'active' : ''}`}
          onClick={() => setActiveTab('reinvest')}
        >
          Auto-Reinvest
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-grid">
              <div className="overview-card">
                <h3>Mining Performance</h3>
                <div className="performance-metrics">
                  <div className="metric">
                    <span className="metric-label">Staked Amount</span>
                    <span className="metric-value">{userStats.totalStaked.toFixed(3)} cbBTC</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Active Hashrate</span>
                    <span className="metric-value">{userStats.totalHashrate.toFixed(1)} TH/s</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Efficiency</span>
                    <span className="metric-value">97.3%</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Uptime</span>
                    <span className="metric-value">99.1%</span>
                  </div>
                </div>
              </div>
              
              <div className="overview-card">
                <h3>Earnings Summary</h3>
                <div className="earnings-chart">
                  <div className="earnings-breakdown">
                    <div className="earning-type">
                      <span className="type-label">Mining Rewards</span>
                      <span className="type-value">{userStats.pendingRewards.toFixed(4)} tokens</span>
                    </div>
                    <div className="earning-type">
                      <span className="type-label">cbBTC Rewards</span>
                      <span className="type-value">{userStats.pendingCbBTCRewards.toFixed(4)} cbBTC</span>
                    </div>
                    <div className="earning-type">
                      <span className="type-label">Aave Yield</span>
                      <span className="type-value">{userStats.aaveYield.toFixed(4)} cbBTC</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <div className="rewards-tab">
            <div className="rewards-section">
              <h3>Available Rewards</h3>
              
              <div className="reward-cards">
                <div className="reward-card">
                  <div className="reward-header">
                    <span className="reward-type">Mining Tokens</span>
                    <span className="reward-amount">{userStats.pendingRewards.toFixed(4)}</span>
                  </div>
                  <button 
                    className="claim-btn"
                    onClick={handleClaimMiningRewards}
                    disabled={isLoading || userStats.pendingRewards === 0}
                  >
                    {isLoading ? 'Claiming...' : 'Claim Mining Rewards'}
                  </button>
                </div>
                
                <div className="reward-card">
                  <div className="reward-header">
                    <span className="reward-type">cbBTC Rewards</span>
                    <span className="reward-amount">{userStats.pendingCbBTCRewards.toFixed(4)}</span>
                  </div>
                  <button 
                    className="claim-btn"
                    onClick={handleClaimCbBTCRewards}
                    disabled={isLoading || userStats.pendingCbBTCRewards === 0}
                  >
                    {isLoading ? 'Claiming...' : 'Claim cbBTC'}
                  </button>
                </div>
                
                <div className="reward-card">
                  <div className="reward-header">
                    <span className="reward-type">Aave Yield</span>
                    <span className="reward-amount">{userStats.aaveYield.toFixed(4)}</span>
                  </div>
                  <button 
                    className="claim-btn"
                    onClick={handleClaimAaveYield}
                    disabled={isLoading || userStats.aaveYield === 0}
                  >
                    {isLoading ? 'Claiming...' : 'Claim Aave Yield'}
                  </button>
                </div>
              </div>
              
              <div className="claim-all-section">
                <button 
                  className="claim-all-btn"
                  onClick={handleClaimAllRewards}
                  disabled={isLoading || (userStats.pendingRewards + userStats.pendingCbBTCRewards + userStats.aaveYield) === 0}
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner"></div>
                      Claiming All...
                    </>
                  ) : (
                    'Claim All Rewards'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aave Tab */}
        {activeTab === 'aave' && (
          <div className="aave-tab">
            <div className="aave-section">
              <h3>DeFi Yield Farming</h3>
              
              <div className="aave-stats">
                <div className="aave-stat">
                  <span className="stat-label">Available to Deposit</span>
                  <span className="stat-value">{userStats.pendingCbBTCRewards.toFixed(4)} cbBTC</span>
                </div>
                <div className="aave-stat">
                  <span className="stat-label">Current APY</span>
                  <span className="stat-value">4.2%</span>
                </div>
                <div className="aave-stat">
                  <span className="stat-label">Health Factor</span>
                  <span className="stat-value">3.45</span>
                </div>
              </div>
              
              <div className="aave-actions">
                <button 
                  className="aave-btn primary"
                  onClick={handleDepositToAave}
                  disabled={isLoading || userStats.pendingCbBTCRewards === 0}
                >
                  Deposit to Aave
                </button>
                <button 
                  className="aave-btn"
                  disabled={isLoading}
                >
                  Withdraw from Aave
                </button>
              </div>
              
              <div className="aave-info">
                <p>Automatically deposit your cbBTC rewards to Aave V3 for additional yield. Your deposits earn interest while remaining as collateral for future opportunities.</p>
              </div>
            </div>
          </div>
        )}

        {/* Reinvestment Tab */}
        {activeTab === 'reinvest' && (
          <div className="reinvest-tab">
            <div className="reinvest-section">
              <h3>Auto-Reinvestment Plan</h3>
              
              <div className="reinvest-status">
                <div className="status-indicator">
                  <span className={`status-dot ${reinvestmentPlan.enabled ? 'active' : 'inactive'}`}></span>
                  <span className="status-text">
                    {reinvestmentPlan.enabled ? 'Auto-Reinvestment Active' : 'Auto-Reinvestment Disabled'}
                  </span>
                </div>
                
                {reinvestmentPlan.enabled && (
                  <div className="reinvest-stats">
                    <div className="reinvest-stat">
                      <span className="stat-label">Reinvestment Rate</span>
                      <span className="stat-value">{reinvestmentPlan.percentage}%</span>
                    </div>
                    <div className="reinvest-stat">
                      <span className="stat-label">Total Reinvested</span>
                      <span className="stat-value">{reinvestmentPlan.totalReinvested.toFixed(4)} cbBTC</span>
                    </div>
                    <div className="reinvest-stat">
                      <span className="stat-label">Additional Hashrate</span>
                      <span className="stat-value">{reinvestmentPlan.additionalHashrate.toFixed(1)} TH/s</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="reinvest-controls">
                <h4>Set Reinvestment Percentage</h4>
                <div className="percentage-buttons">
                  {[0, 25, 50, 75, 100].map(percentage => (
                    <button
                      key={percentage}
                      className={`percentage-btn ${reinvestmentPlan.percentage === percentage ? 'active' : ''}`}
                      onClick={() => handleUpdateReinvestment(percentage)}
                      disabled={isLoading}
                    >
                      {percentage}%
                    </button>
                  ))}
                </div>
                
                <div className="reinvest-info">
                  <p>
                    Auto-reinvestment compounds your earnings by automatically purchasing more hashrate with a percentage of your rewards. 
                    Higher percentages lead to faster growth but less immediate cash flow.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="message error">
          <div className="message-icon">⚠️</div>
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="message success">
          <div className="message-icon">✅</div>
          <span>{success}</span>
        </div>
      )}

      <style jsx>{`
        .mining-dashboard-complete {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: #f8fafc;
          min-height: 100vh;
        }
        
        /* Header Stats */
        .dashboard-header {
          margin-bottom: 30px;
        }
        
        .stat-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }
        
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
          transition: transform 0.2s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
        }
        
        .stat-card.primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .stat-icon {
          font-size: 2rem;
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }
        
        .stat-card:not(.primary) .stat-icon {
          background: #f1f5f9;
        }
        
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        
        .stat-label {
          font-size: 0.9rem;
          opacity: 0.8;
          margin-bottom: 4px;
        }
        
        .stat-value {
          font-size: 1.8rem;
          font-weight: 700;
        }
        
        /* Navigation */
        .tab-navigation {
          display: flex;
          background: white;
          border-radius: 12px;
          padding: 6px;
          margin-bottom: 30px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .tab-btn {
          flex: 1;
          padding: 12px 24px;
          border: none;
          background: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #64748b;
        }
        
        .tab-btn.active {
          background: #667eea;
          color: white;
        }
        
        .tab-btn:hover:not(.active) {
          background: #f1f5f9;
        }
        
        /* Tab Content */
        .tab-content {
          background: white;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        /* Overview Tab */
        .overview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 30px;
        }
        
        .overview-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 24px;
        }
        
        .overview-card h3 {
          margin: 0 0 20px 0;
          color: #1e293b;
          font-weight: 600;
        }
        
        .performance-metrics, .earnings-breakdown {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .metric, .earning-type {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .metric:last-child, .earning-type:last-child {
          border-bottom: none;
        }
        
        .metric-label, .type-label {
          color: #64748b;
          font-weight: 500;
        }
        
        .metric-value, .type-value {
          font-weight: 600;
          color: #1e293b;
        }
        
        /* Rewards Tab */
        .rewards-section h3 {
          margin: 0 0 24px 0;
          color: #1e293b;
          font-weight: 600;
        }
        
        .reward-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .reward-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        
        .reward-header {
          margin-bottom: 16px;
        }
        
        .reward-type {
          display: block;
          color: #64748b;
          font-weight: 500;
          margin-bottom: 8px;
        }
        
        .reward-amount {
          display: block;
          font-size: 1.5rem;
          font-weight: 700;
          color: #10b981;
        }
        
        .claim-btn {
          width: 100%;
          padding: 12px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .claim-btn:hover:not(:disabled) {
          background: #5a67d8;
        }
        
        .claim-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .claim-all-section {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
        }
        
        .claim-all-btn {
          padding: 16px 32px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 auto;
        }
        
        .claim-all-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
        }
        
        .claim-all-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        /* Aave Tab */
        .aave-section h3 {
          margin: 0 0 24px 0;
          color: #1e293b;
          font-weight: 600;
        }
        
        .aave-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .aave-stat {
          display: flex;
          flex-direction: column;
          text-align: center;
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        
        .aave-actions {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .aave-btn {
          flex: 1;
          padding: 14px 24px;
          border: 2px solid #e2e8f0;
          background: white;
          color: #64748b;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .aave-btn.primary {
          background: #667eea;
          border-color: #667eea;
          color: white;
        }
        
        .aave-btn:hover:not(:disabled) {
          border-color: #667eea;
          color: #667eea;
        }
        
        .aave-btn.primary:hover:not(:disabled) {
          background: #5a67d8;
          border-color: #5a67d8;
        }
        
        .aave-info {
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }
        
        .aave-info p {
          margin: 0;
          color: #64748b;
          line-height: 1.6;
        }
        
        /* Reinvestment Tab */
        .reinvest-section h3 {
          margin: 0 0 24px 0;
          color: #1e293b;
          font-weight: 600;
        }
        
        .reinvest-status {
          margin-bottom: 30px;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        
        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ef4444;
        }
        
        .status-dot.active {
          background: #10b981;
        }
        
        .status-text {
          font-weight: 600;
          color: #1e293b;
        }
        
        .reinvest-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        }
        
        .reinvest-stat {
          display: flex;
          flex-direction: column;
          text-align: center;
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        
        .reinvest-controls h4 {
          margin: 0 0 16px 0;
          color: #1e293b;
          font-weight: 600;
        }
        
        .percentage-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .percentage-btn {
          flex: 1;
          padding: 12px;
          border: 2px solid #e2e8f0;
          background: white;
          color: #64748b;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .percentage-btn.active {
          background: #667eea;
          border-color: #667eea;
          color: white;
        }
        
        .percentage-btn:hover:not(:disabled):not(.active) {
          border-color: #667eea;
          color: #667eea;
        }
        
        .reinvest-info {
          padding: 16px;
          background: #f8fafc;
          border-radius: 8px;
          border-left: 4px solid #f59e0b;
        }
        
        .reinvest-info p {
          margin: 0;
          color: #64748b;
          line-height: 1.6;
        }
        
        /* Loading Spinner */
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Messages */
        .message {
          position: fixed;
          bottom: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 20px;
          border-radius: 8px;
          font-weight: 500;
          z-index: 1000;
          animation: slideIn 0.3s ease;
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
        
        .message-icon {
          font-size: 1.2rem;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          .mining-dashboard-complete {
            padding: 15px;
          }
          
          .stat-cards {
            grid-template-columns: 1fr;
          }
          
          .overview-grid {
            grid-template-columns: 1fr;
          }
          
          .reward-cards {
            grid-template-columns: 1fr;
          }
          
          .aave-actions {
            flex-direction: column;
          }
          
          .percentage-buttons {
            flex-wrap: wrap;
          }
          
          .tab-navigation {
            overflow-x: auto;
            padding: 4px;
          }
          
          .tab-btn {
            white-space: nowrap;
            min-width: 120px;
          }
        }
      `}</style>
    </div>
  );
};