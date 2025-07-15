import React, { useState, useEffect } from 'react';
import { Web3Service } from '../../services/web3Service';

interface AsicMiningDashboardProps {
  web3Service: Web3Service | null;
  userAddress: string;
}

interface AsicInfo {
  model: string;
  totalHashRate: number; // TH/s
  fractionHashRate: number; // TH/s per token
  totalFractions: number;
  availableFractions: number;
  dailyRoi: number; // USD per fraction
  pricePerFraction: number; // USD
}

interface UserPosition {
  ownedFractions: number;
  totalHashRateOwned: number; // TH/s
  dailyEarnings: number; // USD
  totalEarned: number; // USD
  lastClaimTime: number;
}

export const AsicMiningDashboard: React.FC<AsicMiningDashboardProps> = ({
  web3Service,
  userAddress
}) => {
  // ASIC S21+ specifications
  const [asicInfo, setAsicInfo] = useState<AsicInfo>({
    model: "Antminer S21+",
    totalHashRate: 216, // 216 TH/s
    fractionHashRate: 18, // 18 TH/s per fraction
    totalFractions: 12, // 216/18 = 12 fractions total
    availableFractions: 8.2, // Available for purchase
    dailyRoi: 0.9, // $0.90 USD per day per fraction
    pricePerFraction: 630 // $630 USD per 18 TH/s fraction
  });

  const [userPosition, setUserPosition] = useState<UserPosition>({
    ownedFractions: 0,
    totalHashRateOwned: 0,
    dailyEarnings: 0,
    totalEarned: 0,
    lastClaimTime: 0
  });

  const [btcPrice, setBtcPrice] = useState<number>(45000); // USD
  const [purchaseAmount, setPurchaseAmount] = useState<string>('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mock data for demonstration - in real app this would come from contracts
  useEffect(() => {
    // Simulate user having some fractions
    setUserPosition({
      ownedFractions: 1.5, // User owns 1.5 fractions (27 TH/s)
      totalHashRateOwned: 27, // 1.5 * 18 TH/s
      dailyEarnings: 1.35, // $1.35 per day
      totalEarned: 45.0, // $45 total earned
      lastClaimTime: Date.now() - 86400000 // Last claim 1 day ago
    });

    // Simulate fetching BTC price
    const fetchBtcPrice = async () => {
      if (web3Service) {
        try {
          const priceData = await web3Service.getBTCPrice();
          setBtcPrice(parseFloat(priceData.price));
        } catch (err) {
          console.log('Using mock BTC price');
        }
      }
    };

    fetchBtcPrice();
    const interval = setInterval(fetchBtcPrice, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [web3Service]);

  const handlePurchaseFractions = async () => {
    if (!web3Service || !purchaseAmount) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const fractions = parseFloat(purchaseAmount);
      const totalCost = fractions * asicInfo.pricePerFraction;
      
      // In real implementation, this would interact with smart contracts
      console.log(`Purchasing ${fractions} fractions for $${totalCost}`);
      
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update user position
      setUserPosition(prev => ({
        ...prev,
        ownedFractions: prev.ownedFractions + fractions,
        totalHashRateOwned: prev.totalHashRateOwned + (fractions * asicInfo.fractionHashRate),
        dailyEarnings: prev.dailyEarnings + (fractions * asicInfo.dailyRoi)
      }));
      
      // Update available fractions
      setAsicInfo(prev => ({
        ...prev,
        availableFractions: prev.availableFractions - fractions
      }));
      
      setSuccessMessage(`Successfully purchased ${fractions} fractions (${fractions * asicInfo.fractionHashRate} TH/s)!`);
      setPurchaseAmount('1');
    } catch (err: any) {
      setError(err.message || 'Failed to purchase fractions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimEarnings = async () => {
    if (!web3Service) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Calculate pending earnings (simplified)
      const hoursElapsed = (Date.now() - userPosition.lastClaimTime) / (1000 * 60 * 60);
      const pendingEarnings = (userPosition.dailyEarnings / 24) * hoursElapsed;
      
      // Simulate claim transaction
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setUserPosition(prev => ({
        ...prev,
        totalEarned: prev.totalEarned + pendingEarnings,
        lastClaimTime: Date.now()
      }));
      
      setSuccessMessage(`Successfully claimed $${pendingEarnings.toFixed(2)} in earnings!`);
    } catch (err: any) {
      setError(err.message || 'Failed to claim earnings');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  const calculatePendingEarnings = () => {
    const hoursElapsed = (Date.now() - userPosition.lastClaimTime) / (1000 * 60 * 60);
    return (userPosition.dailyEarnings / 24) * hoursElapsed;
  };

  const calculateHashratePercentage = (hashrate: number) => {
    return ((hashrate / asicInfo.totalHashRate) * 100).toFixed(2);
  };

  return (
    <div className="asic-mining-dashboard">
      <div className="dashboard-header">
        <h2>⚡ ASIC Mining Tokenization</h2>
        <div className="btc-price">
          <span>₿ ${formatNumber(btcPrice, 0)}</span>
        </div>
      </div>

      {/* ASIC Machine Info */}
      <div className="asic-info-card">
        <div className="asic-header">
          <h3>🔧 {asicInfo.model}</h3>
          <div className="asic-specs">
            <span className="spec">216 TH/s Total</span>
            <span className="spec">3,510W Power</span>
            <span className="spec">SHA-256</span>
          </div>
        </div>
        
        <div className="asic-stats">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Total Hashrate</span>
              <span className="stat-value">{asicInfo.totalHashRate} TH/s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Fraction Size</span>
              <span className="stat-value">{asicInfo.fractionHashRate} TH/s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Fractions</span>
              <span className="stat-value">{formatNumber(asicInfo.totalFractions, 1)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Available</span>
              <span className="stat-value">{formatNumber(asicInfo.availableFractions, 1)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Daily ROI/Fraction</span>
              <span className="stat-value">${formatNumber(asicInfo.dailyRoi)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Price/Fraction</span>
              <span className="stat-value">${formatNumber(asicInfo.pricePerFraction, 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Position */}
      <div className="user-position-card">
        <h3>📊 Your Mining Position</h3>
        
        {userPosition.ownedFractions > 0 ? (
          <div className="position-stats">
            <div className="position-grid">
              <div className="position-item">
                <span className="position-label">Owned Fractions</span>
                <span className="position-value">{formatNumber(userPosition.ownedFractions, 2)}</span>
              </div>
              <div className="position-item">
                <span className="position-label">Total Hashrate</span>
                <span className="position-value">{formatNumber(userPosition.totalHashRateOwned)} TH/s</span>
              </div>
              <div className="position-item">
                <span className="position-label">Machine Ownership</span>
                <span className="position-value">{calculateHashratePercentage(userPosition.totalHashRateOwned)}%</span>
              </div>
              <div className="position-item">
                <span className="position-label">Daily Earnings</span>
                <span className="position-value">${formatNumber(userPosition.dailyEarnings)}</span>
              </div>
              <div className="position-item">
                <span className="position-label">Total Earned</span>
                <span className="position-value">${formatNumber(userPosition.totalEarned)}</span>
              </div>
              <div className="position-item">
                <span className="position-label">Pending Earnings</span>
                <span className="position-value">${formatNumber(calculatePendingEarnings())}</span>
              </div>
            </div>
            
            <button 
              onClick={handleClaimEarnings}
              disabled={isLoading || calculatePendingEarnings() < 0.01}
              className="claim-button"
            >
              {isLoading ? 'Claiming...' : 'Claim Earnings'}
            </button>
          </div>
        ) : (
          <div className="no-position">
            <p>You don't own any mining fractions yet.</p>
            <p>Purchase fractions below to start earning!</p>
          </div>
        )}
      </div>

      {/* Purchase Fractions */}
      <div className="purchase-card">
        <h3>💰 Purchase Mining Fractions</h3>
        
        <div className="purchase-info">
          <div className="fraction-details">
            <h4>Fraction Details:</h4>
            <ul>
              <li>📈 Hashrate: {asicInfo.fractionHashRate} TH/s per fraction</li>
              <li>💵 Daily ROI: ${asicInfo.dailyRoi} per fraction</li>
              <li>🔋 Power Share: {(3510 / asicInfo.totalFractions * parseFloat(purchaseAmount || '1')).toFixed(0)}W</li>
              <li>📊 Machine Share: {calculateHashratePercentage(asicInfo.fractionHashRate * parseFloat(purchaseAmount || '1'))}%</li>
            </ul>
          </div>
        </div>
        
        <div className="purchase-form">
          <div className="input-group">
            <label>Number of Fractions:</label>
            <input
              type="number"
              placeholder="1.0"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              min="0.1"
              max={asicInfo.availableFractions}
              step="0.1"
            />
          </div>
          
          <div className="purchase-summary">
            <div className="summary-item">
              <span>Fractions: {purchaseAmount || '0'}</span>
            </div>
            <div className="summary-item">
              <span>Hashrate: {formatNumber((parseFloat(purchaseAmount || '0')) * asicInfo.fractionHashRate)} TH/s</span>
            </div>
            <div className="summary-item">
              <span>Daily Earnings: ${formatNumber((parseFloat(purchaseAmount || '0')) * asicInfo.dailyRoi)}</span>
            </div>
            <div className="summary-item total">
              <span>Total Cost: ${formatNumber((parseFloat(purchaseAmount || '0')) * asicInfo.pricePerFraction, 0)}</span>
            </div>
          </div>
          
          <button 
            onClick={handlePurchaseFractions}
            disabled={isLoading || !purchaseAmount || parseFloat(purchaseAmount) <= 0 || parseFloat(purchaseAmount) > asicInfo.availableFractions}
            className="purchase-button"
          >
            {isLoading ? 'Processing...' : 'Purchase Fractions'}
          </button>
        </div>
      </div>

      {/* Mining Calculator */}
      <div className="calculator-card">
        <h3>🧮 Mining Calculator</h3>
        <div className="calculator-grid">
          <div className="calc-item">
            <span className="calc-label">Revenue per TH/s/day:</span>
            <span className="calc-value">${(asicInfo.dailyRoi / asicInfo.fractionHashRate).toFixed(3)}</span>
          </div>
          <div className="calc-item">
            <span className="calc-label">Annual ROI per fraction:</span>
            <span className="calc-value">{((asicInfo.dailyRoi * 365 / asicInfo.pricePerFraction) * 100).toFixed(1)}%</span>
          </div>
          <div className="calc-item">
            <span className="calc-label">Break-even period:</span>
            <span className="calc-value">{(asicInfo.pricePerFraction / asicInfo.dailyRoi).toFixed(0)} days</span>
          </div>
          <div className="calc-item">
            <span className="calc-label">Monthly earnings/fraction:</span>
            <span className="calc-value">${(asicInfo.dailyRoi * 30).toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="message error">
          <p>❌ {error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="message success">
          <p>✅ {successMessage}</p>
        </div>
      )}

      <style jsx>{`
        .asic-mining-dashboard {
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
        
        .btc-price {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        .asic-info-card {
          background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
          color: white;
          border-radius: 16px;
          padding: 24px;
        }
        
        .asic-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .asic-header h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }
        
        .asic-specs {
          display: flex;
          gap: 12px;
        }
        
        .spec {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .stat-label {
          font-size: 0.85rem;
          opacity: 0.8;
        }
        
        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
        }
        
        .user-position-card, .purchase-card, .calculator-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
        }
        
        .user-position-card h3, .purchase-card h3, .calculator-card h3 {
          margin: 0 0 20px 0;
          color: #1f2937;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .position-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .position-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .position-label {
          color: #6b7280;
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        .position-value {
          color: #1f2937;
          font-size: 1.1rem;
          font-weight: 700;
        }
        
        .no-position {
          text-align: center;
          color: #6b7280;
          padding: 20px;
        }
        
        .purchase-info {
          background: #f8fafc;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
        }
        
        .fraction-details h4 {
          margin: 0 0 12px 0;
          color: #1f2937;
        }
        
        .fraction-details ul {
          margin: 0;
          padding-left: 20px;
          color: #4b5563;
        }
        
        .fraction-details li {
          margin-bottom: 4px;
        }
        
        .purchase-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .input-group label {
          font-weight: 500;
          color: #374151;
        }
        
        .input-group input {
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
        
        .purchase-summary {
          background: #f3f4f6;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          font-weight: 500;
        }
        
        .summary-item.total {
          border-top: 1px solid #d1d5db;
          padding-top: 8px;
          font-weight: 700;
          font-size: 1.1rem;
          color: #1f2937;
        }
        
        .purchase-button, .claim-button {
          background: #10b981;
          border: none;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .purchase-button:hover:not(:disabled), .claim-button:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-1px);
        }
        
        .purchase-button:disabled, .claim-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .calculator-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }
        
        .calc-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
        }
        
        .calc-label {
          color: #6b7280;
          font-weight: 500;
        }
        
        .calc-value {
          color: #1f2937;
          font-weight: 700;
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
        
        @media (max-width: 768px) {
          .asic-mining-dashboard {
            padding: 16px;
          }
          
          .dashboard-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
          
          .asic-header {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
          
          .asic-specs {
            flex-wrap: wrap;
          }
          
          .stat-grid, .position-grid, .calculator-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};