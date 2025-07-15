import React, { useState, useEffect } from 'react';
import { Web3Service } from '../services/web3Service';

interface CleanMiningInterfaceProps {
  web3Service: Web3Service | null;
  userAddress: string;
}

export const CleanMiningInterface: React.FC<CleanMiningInterfaceProps> = ({
  web3Service,
  userAddress
}) => {
  const [thAmount, setThAmount] = useState<string>('20');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Mining parameters
  const pricePerTH = 35; // $35 per TH
  const dailyROI = 0.075; // $0.075 per TH per day
  const minTH = 20;
  const maxTH = 50;

  const calculateCost = (th: number) => th * pricePerTH;
  const calculateDailyEarnings = (th: number) => th * dailyROI;
  const calculateMonthlyEarnings = (th: number) => calculateDailyEarnings(th) * 30;
  const calculateROI = (th: number) => (calculateDailyEarnings(th) * 365 / calculateCost(th)) * 100;

  const handlePurchase = async () => {
    if (!web3Service || !thAmount) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const th = parseFloat(thAmount);
      if (th < minTH || th > maxTH) {
        throw new Error(`TH amount must be between ${minTH} and ${maxTH}`);
      }
      
      // Simulate purchase
      console.log(`Purchasing ${th} TH for $${calculateCost(th)}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSuccess(`Successfully purchased ${th} TH! You'll earn $${calculateDailyEarnings(th).toFixed(2)}/day`);
      setThAmount('20');
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="clean-mining-interface">
      {/* Hero Section with ASIC Image */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="asic-showcase">
            <div className="asic-image-container">
              <div className="asic-image">
                {/* Stylized S21+ ASIC Miner */}
                <div className="miner-body">
                  <div className="miner-top">
                    <div className="fan fan-left"></div>
                    <div className="brand-label">ANTMINER S21+</div>
                    <div className="fan fan-right"></div>
                  </div>
                  <div className="miner-middle">
                    <div className="hashboard"></div>
                    <div className="hashboard"></div>
                    <div className="hashboard"></div>
                  </div>
                  <div className="miner-bottom">
                    <div className="power-port"></div>
                    <div className="ethernet-port"></div>
                    <div className="status-lights">
                      <div className="status-light green"></div>
                      <div className="status-light green"></div>
                      <div className="status-light orange"></div>
                    </div>
                  </div>
                </div>
                
                {/* Mining stats overlay */}
                <div className="mining-stats">
                  <div className="stat">
                    <span className="value">216</span>
                    <span className="unit">TH/s</span>
                  </div>
                  <div className="stat">
                    <span className="value">3,510</span>
                    <span className="unit">W</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="hero-text">
              <h1>Own a Fraction of Real Bitcoin Mining</h1>
              <p className="hero-subtitle">
                Purchase hashrate from our Antminer S21+ and earn daily returns in USDC
              </p>
              
              <div className="key-metrics">
                <div className="metric">
                  <span className="metric-value">$35</span>
                  <span className="metric-label">per TH</span>
                </div>
                <div className="metric">
                  <span className="metric-value">$1.50</span>
                  <span className="metric-label">daily per 20 TH</span>
                </div>
                <div className="metric">
                  <span className="metric-value">77%</span>
                  <span className="metric-label">annual ROI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Interface */}
      <div className="purchase-section">
        <div className="purchase-container">
          <div className="purchase-card">
            <div className="card-header">
              <h2>Buy Mining Power</h2>
              <p>Start earning daily returns from real Bitcoin mining</p>
            </div>
            
            <div className="card-body">
              <div className="input-section">
                <label className="input-label">
                  Hashrate Amount (TH)
                  <span className="label-hint">Minimum: {minTH} TH • Maximum: {maxTH} TH</span>
                </label>
                
                <div className="input-container">
                  <input
                    type="number"
                    value={thAmount}
                    onChange={(e) => setThAmount(e.target.value)}
                    min={minTH}
                    max={maxTH}
                    step="1"
                    className="th-input"
                    placeholder="20"
                  />
                  <span className="input-suffix">TH</span>
                </div>
                
                <div className="quick-select">
                  <button 
                    onClick={() => setThAmount('20')}
                    className={`quick-btn ${thAmount === '20' ? 'active' : ''}`}
                  >
                    20 TH
                  </button>
                  <button 
                    onClick={() => setThAmount('30')}
                    className={`quick-btn ${thAmount === '30' ? 'active' : ''}`}
                  >
                    30 TH
                  </button>
                  <button 
                    onClick={() => setThAmount('50')}
                    className={`quick-btn ${thAmount === '50' ? 'active' : ''}`}
                  >
                    50 TH
                  </button>
                </div>
              </div>
              
              {/* Live Calculations */}
              <div className="calculations">
                <div className="calc-row">
                  <span className="calc-label">Investment Cost</span>
                  <span className="calc-value">${calculateCost(parseFloat(thAmount || '0')).toLocaleString()}</span>
                </div>
                <div className="calc-row">
                  <span className="calc-label">Daily Earnings</span>
                  <span className="calc-value highlight">${calculateDailyEarnings(parseFloat(thAmount || '0')).toFixed(2)}</span>
                </div>
                <div className="calc-row">
                  <span className="calc-label">Monthly Earnings</span>
                  <span className="calc-value">${calculateMonthlyEarnings(parseFloat(thAmount || '0')).toFixed(0)}</span>
                </div>
                <div className="calc-row">
                  <span className="calc-label">Annual ROI</span>
                  <span className="calc-value roi">{calculateROI(parseFloat(thAmount || '0')).toFixed(1)}%</span>
                </div>
              </div>
              
              {/* Purchase Button */}
              <button 
                onClick={handlePurchase}
                disabled={isLoading || !thAmount || parseFloat(thAmount) < minTH || parseFloat(thAmount) > maxTH}
                className="purchase-btn"
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Buy {thAmount || '0'} TH for ${calculateCost(parseFloat(thAmount || '0')).toLocaleString()}
                  </>
                )}
              </button>
              
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
            </div>
          </div>
          
          {/* Info Cards */}
          <div className="info-cards">
            <div className="info-card">
              <div className="info-icon">🔒</div>
              <h3>Secure & Transparent</h3>
              <p>Your ownership is recorded on-chain with full transparency</p>
            </div>
            
            <div className="info-card">
              <div className="info-icon">💰</div>
              <h3>Daily USDC Payments</h3>
              <p>Receive stable daily returns paid directly to your wallet</p>
            </div>
            
            <div className="info-card">
              <div className="info-icon">⚡</div>
              <h3>Real Mining Hardware</h3>
              <p>Powered by actual Antminer S21+ machines in Paraguay</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .clean-mining-interface {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        /* Hero Section */
        .hero-section {
          padding: 60px 20px 0;
          color: white;
        }
        
        .hero-content {
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .asic-showcase {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          min-height: 500px;
        }
        
        .asic-image-container {
          position: relative;
          display: flex;
          justify-content: center;
        }
        
        /* Stylized ASIC Miner */
        .asic-image {
          position: relative;
          transform: perspective(1000px) rotateY(-15deg) rotateX(5deg);
          filter: drop-shadow(0 20px 40px rgba(0,0,0,0.3));
        }
        
        .miner-body {
          width: 280px;
          height: 200px;
          background: linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%);
          border-radius: 8px;
          border: 2px solid #333;
          position: relative;
          overflow: hidden;
        }
        
        .miner-top {
          height: 60px;
          background: linear-gradient(180deg, #333 0%, #2a2a2a 100%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          border-bottom: 1px solid #444;
        }
        
        .fan {
          width: 35px;
          height: 35px;
          border: 2px solid #555;
          border-radius: 50%;
          background: radial-gradient(circle, #444 30%, #333 70%);
          position: relative;
          animation: rotate 2s linear infinite;
        }
        
        .fan::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 3px;
          height: 25px;
          background: #666;
          transform: translate(-50%, -50%);
          border-radius: 2px;
        }
        
        .fan::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 25px;
          height: 3px;
          background: #666;
          transform: translate(-50%, -50%);
          border-radius: 2px;
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .brand-label {
          font-size: 10px;
          font-weight: bold;
          color: #fff;
          background: #ff6b00;
          padding: 2px 6px;
          border-radius: 3px;
          letter-spacing: 0.5px;
        }
        
        .miner-middle {
          height: 100px;
          display: flex;
          gap: 8px;
          padding: 15px;
          background: #1a1a1a;
        }
        
        .hashboard {
          flex: 1;
          background: linear-gradient(45deg, #2d5016 0%, #3d6b1f 100%);
          border-radius: 4px;
          border: 1px solid #4a7a24;
          position: relative;
        }
        
        .hashboard::before {
          content: '';
          position: absolute;
          top: 10px;
          left: 8px;
          right: 8px;
          height: 2px;
          background: #5a9a2a;
          border-radius: 1px;
        }
        
        .hashboard::after {
          content: '';
          position: absolute;
          bottom: 10px;
          left: 8px;
          right: 8px;
          height: 2px;
          background: #5a9a2a;
          border-radius: 1px;
        }
        
        .miner-bottom {
          height: 40px;
          background: #2a2a2a;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
        }
        
        .power-port {
          width: 25px;
          height: 15px;
          background: #000;
          border: 1px solid #555;
          border-radius: 2px;
        }
        
        .ethernet-port {
          width: 20px;
          height: 12px;
          background: #000;
          border: 1px solid #555;
          border-radius: 1px;
        }
        
        .status-lights {
          display: flex;
          gap: 5px;
        }
        
        .status-light {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        }
        
        .status-light.green {
          background: #4ade80;
          box-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
        }
        
        .status-light.orange {
          background: #fb923c;
          box-shadow: 0 0 10px rgba(251, 146, 60, 0.5);
          animation-delay: 0.5s;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .mining-stats {
          position: absolute;
          top: -30px;
          right: -40px;
          display: flex;
          gap: 15px;
        }
        
        .stat {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 8px 12px;
          text-align: center;
          min-width: 60px;
        }
        
        .stat .value {
          display: block;
          font-size: 18px;
          font-weight: bold;
          color: #fff;
        }
        
        .stat .unit {
          display: block;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.8);
          margin-top: 2px;
        }
        
        /* Hero Text */
        .hero-text h1 {
          font-size: 3rem;
          font-weight: 800;
          margin: 0 0 16px 0;
          line-height: 1.2;
        }
        
        .hero-subtitle {
          font-size: 1.2rem;
          opacity: 0.9;
          margin: 0 0 40px 0;
          line-height: 1.6;
        }
        
        .key-metrics {
          display: flex;
          gap: 30px;
        }
        
        .metric {
          text-align: center;
        }
        
        .metric-value {
          display: block;
          font-size: 2rem;
          font-weight: bold;
          color: #fff;
          margin-bottom: 4px;
        }
        
        .metric-label {
          font-size: 0.9rem;
          opacity: 0.8;
        }
        
        /* Purchase Section */
        .purchase-section {
          background: #f8fafc;
          padding: 80px 20px;
          margin-top: -40px;
          border-radius: 40px 40px 0 0;
        }
        
        .purchase-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: start;
        }
        
        .purchase-card {
          background: white;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
        }
        
        .card-header {
          margin-bottom: 30px;
        }
        
        .card-header h2 {
          font-size: 2rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 8px 0;
        }
        
        .card-header p {
          color: #64748b;
          margin: 0;
          font-size: 1.1rem;
        }
        
        .input-section {
          margin-bottom: 30px;
        }
        
        .input-label {
          display: block;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          font-size: 1rem;
        }
        
        .label-hint {
          display: block;
          font-weight: 400;
          color: #6b7280;
          font-size: 0.85rem;
          margin-top: 2px;
        }
        
        .input-container {
          position: relative;
          margin-bottom: 16px;
        }
        
        .th-input {
          width: 100%;
          padding: 16px 50px 16px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1.2rem;
          font-weight: 600;
          background: #fafafa;
          transition: all 0.2s ease;
        }
        
        .th-input:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .input-suffix {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-weight: 600;
          color: #6b7280;
          font-size: 1.1rem;
        }
        
        .quick-select {
          display: flex;
          gap: 8px;
        }
        
        .quick-btn {
          flex: 1;
          padding: 10px;
          border: 2px solid #e2e8f0;
          background: white;
          color: #64748b;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .quick-btn:hover {
          border-color: #667eea;
          color: #667eea;
        }
        
        .quick-btn.active {
          border-color: #667eea;
          background: #667eea;
          color: white;
        }
        
        .calculations {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        .calc-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .calc-row:last-child {
          border-bottom: none;
        }
        
        .calc-label {
          color: #64748b;
          font-weight: 500;
        }
        
        .calc-value {
          font-weight: 700;
          color: #1e293b;
          font-size: 1.1rem;
        }
        
        .calc-value.highlight {
          color: #10b981;
        }
        
        .calc-value.roi {
          color: #667eea;
        }
        
        .purchase-btn {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        
        .purchase-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }
        
        .purchase-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
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
        
        .message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 8px;
          font-weight: 500;
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
        
        /* Info Cards */
        .info-cards {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .info-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #e2e8f0;
          transition: transform 0.2s ease;
        }
        
        .info-card:hover {
          transform: translateY(-2px);
        }
        
        .info-icon {
          font-size: 2rem;
          margin-bottom: 12px;
        }
        
        .info-card h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0 0 8px 0;
        }
        
        .info-card p {
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          .asic-showcase {
            grid-template-columns: 1fr;
            gap: 40px;
            text-align: center;
          }
          
          .purchase-container {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          
          .hero-text h1 {
            font-size: 2rem;
          }
          
          .key-metrics {
            justify-content: center;
            flex-wrap: wrap;
            gap: 20px;
          }
          
          .purchase-card {
            padding: 30px 20px;
          }
          
          .asic-image {
            transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
            scale: 0.8;
          }
          
          .mining-stats {
            position: static;
            justify-content: center;
            margin-top: 20px;
          }
        }
      `}</style>
    </div>
  );
};