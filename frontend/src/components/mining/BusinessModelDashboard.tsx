import React, { useState, useEffect } from 'react';
import { Web3Service } from '../../services/web3Service';

interface BusinessModelDashboardProps {
  web3Service: Web3Service | null;
  userAddress: string;
}

interface MiningParameters {
  preco_inicial_th: number; // US$35/TH
  lucro_diario_base: number; // US$0.075/TH/dia
  markup_percentual: number; // 5%
  custo_energia_kwh: number; // US$0.07
  entrada_minima_th: number; // 20 TH
  entrada_minima_usd: number; // US$700
  lucro_diario_pacote: number; // US$1.50/dia
  lucro_mensal_pacote: number; // US$45/mês
  roi_anual: number; // 77%
  breakeven_meses: number; // 15.5 meses
  breakeven_defi_meses: number; // 13.6 meses
  reinvestimento_defi_diario: number; // US$0.50/dia
  crescimento_th_mensal: number; // 0.429 TH/mês
}

interface UserMiningPosition {
  total_th_owned: number;
  initial_investment_usd: number;
  days_mining: number;
  total_earned_usdc: number;
  daily_earning_usdc: number;
  monthly_earning_usdc: number;
  defi_earnings_usdc: number;
  reinvested_th: number;
  roi_percentage: number;
  breakeven_progress: number;
  projected_annual_return: number;
}

export const BusinessModelDashboard: React.FC<BusinessModelDashboardProps> = ({
  web3Service,
  userAddress
}) => {
  const [params] = useState<MiningParameters>({
    preco_inicial_th: 35.00,
    lucro_diario_base: 0.075,
    markup_percentual: 5,
    custo_energia_kwh: 0.07,
    entrada_minima_th: 20,
    entrada_minima_usd: 700,
    lucro_diario_pacote: 1.50,
    lucro_mensal_pacote: 45.00,
    roi_anual: 77,
    breakeven_meses: 15.5,
    breakeven_defi_meses: 13.6,
    reinvestimento_defi_diario: 0.50,
    crescimento_th_mensal: 0.429
  });

  const [userPosition, setUserPosition] = useState<UserMiningPosition>({
    total_th_owned: 40, // User owns 40 TH (2 packages)
    initial_investment_usd: 1400, // US$1400 invested
    days_mining: 45, // Mining for 45 days
    total_earned_usdc: 67.50, // US$67.50 earned so far
    daily_earning_usdc: 3.00, // US$3.00/day (40 TH * 0.075)
    monthly_earning_usdc: 90.00, // US$90/month
    defi_earnings_usdc: 22.50, // US$22.50 from DeFi
    reinvested_th: 2.58, // 2.58 TH reinvested from DeFi
    roi_percentage: 4.82, // 4.82% ROI so far
    breakeven_progress: 14.5, // 14.5% progress to breakeven
    projected_annual_return: 1078 // US$1078 projected annual return
  });

  const [btcPrice, setBtcPrice] = useState<number>(45000);
  const [purchaseTH, setPurchaseTH] = useState<string>('20');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate daily earnings accumulation
      setUserPosition(prev => ({
        ...prev,
        total_earned_usdc: prev.total_earned_usdc + (prev.daily_earning_usdc / 24 / 60), // Per minute
        defi_earnings_usdc: prev.defi_earnings_usdc + (params.reinvestimento_defi_diario / 24 / 60),
        days_mining: prev.days_mining + (1 / 24 / 60),
        roi_percentage: ((prev.total_earned_usdc + prev.defi_earnings_usdc) / prev.initial_investment_usd) * 100,
        breakeven_progress: (prev.days_mining / (params.breakeven_defi_meses * 30)) * 100
      }));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [params]);

  const calculatePurchaseCost = (th: number) => {
    return th * params.preco_inicial_th;
  };

  const calculateDailyEarnings = (th: number) => {
    return th * params.lucro_diario_base;
  };

  const calculateMonthlyEarnings = (th: number) => {
    return calculateDailyEarnings(th) * 30;
  };

  const calculateAnnualROI = (th: number) => {
    const dailyEarnings = calculateDailyEarnings(th);
    const annualEarnings = dailyEarnings * 365;
    const investment = calculatePurchaseCost(th);
    return (annualEarnings / investment) * 100;
  };

  const calculateBreakevenDays = (th: number, withDefi: boolean = false) => {
    const investment = calculatePurchaseCost(th);
    const dailyEarnings = calculateDailyEarnings(th);
    const defiBonus = withDefi ? params.reinvestimento_defi_diario : 0;
    return investment / (dailyEarnings + defiBonus);
  };

  const handlePurchaseTH = async () => {
    if (!web3Service || !purchaseTH) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const th = parseFloat(purchaseTH);
      const cost = calculatePurchaseCost(th);
      
      if (th < params.entrada_minima_th) {
        throw new Error(`Minimum purchase is ${params.entrada_minima_th} TH`);
      }
      
      // Simulate smart contract interaction
      console.log(`Purchasing ${th} TH for $${cost} USDC`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update user position
      setUserPosition(prev => ({
        ...prev,
        total_th_owned: prev.total_th_owned + th,
        initial_investment_usd: prev.initial_investment_usd + cost,
        daily_earning_usdc: calculateDailyEarnings(prev.total_th_owned + th),
        monthly_earning_usdc: calculateMonthlyEarnings(prev.total_th_owned + th)
      }));
      
      setSuccessMessage(`Successfully purchased ${th} TH for $${cost} USDC!`);
      setPurchaseTH('20');
    } catch (err: any) {
      setError(err.message || 'Failed to purchase TH');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (value: number, decimals: number = 2) => {
    return value.toFixed(decimals);
  };

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return `$${formatNumber(value)} ${currency}`;
  };

  return (
    <div className="business-model-dashboard">
      <div className="dashboard-header">
        <h2>⚡ Mineradora Tokenizada - Modelo de Negócio</h2>
        <div className="btc-price">
          <span>₿ ${formatNumber(btcPrice, 0)}</span>
        </div>
      </div>

      {/* Business Parameters */}
      <div className="parameters-card">
        <h3>📊 Parâmetros da Operação</h3>
        <div className="params-grid">
          <div className="param-item">
            <span className="param-label">Preço por TH:</span>
            <span className="param-value">${formatNumber(params.preco_inicial_th)}</span>
          </div>
          <div className="param-item">
            <span className="param-label">Lucro/TH/dia:</span>
            <span className="param-value">${formatNumber(params.lucro_diario_base, 3)}</span>
          </div>
          <div className="param-item">
            <span className="param-label">Entrada mínima:</span>
            <span className="param-value">{params.entrada_minima_th} TH (${params.entrada_minima_usd})</span>
          </div>
          <div className="param-item">
            <span className="param-label">ROI anual:</span>
            <span className="param-value">{params.roi_anual}%</span>
          </div>
          <div className="param-item">
            <span className="param-label">Breakeven (sem DeFi):</span>
            <span className="param-value">{params.breakeven_meses} meses</span>
          </div>
          <div className="param-item">
            <span className="param-label">Breakeven (com DeFi):</span>
            <span className="param-value">{params.breakeven_defi_meses} meses</span>
          </div>
        </div>
      </div>

      {/* User Position */}
      <div className="position-card">
        <h3>📈 Sua Posição de Mineração</h3>
        <div className="position-grid">
          <div className="position-item highlight">
            <span className="position-label">TH Minerando</span>
            <span className="position-value">{formatNumber(userPosition.total_th_owned)} TH</span>
          </div>
          <div className="position-item">
            <span className="position-label">Investimento Inicial</span>
            <span className="position-value">{formatCurrency(userPosition.initial_investment_usd, 'USDC')}</span>
          </div>
          <div className="position-item">
            <span className="position-label">Dias Minerando</span>
            <span className="position-value">{formatNumber(userPosition.days_mining, 1)} dias</span>
          </div>
          <div className="position-item">
            <span className="position-label">Total Ganho</span>
            <span className="position-value">{formatCurrency(userPosition.total_earned_usdc, 'USDC')}</span>
          </div>
          <div className="position-item">
            <span className="position-label">Ganho Diário</span>
            <span className="position-value">{formatCurrency(userPosition.daily_earning_usdc, 'USDC')}</span>
          </div>
          <div className="position-item">
            <span className="position-label">Ganho Mensal</span>
            <span className="position-value">{formatCurrency(userPosition.monthly_earning_usdc, 'USDC')}</span>
          </div>
          <div className="position-item">
            <span className="position-label">Ganhos DeFi</span>
            <span className="position-value">{formatCurrency(userPosition.defi_earnings_usdc, 'USDC')}</span>
          </div>
          <div className="position-item">
            <span className="position-label">TH Reinvestido</span>
            <span className="position-value">{formatNumber(userPosition.reinvested_th)} TH</span>
          </div>
          <div className="position-item">
            <span className="position-label">ROI Atual</span>
            <span className="position-value">{formatNumber(userPosition.roi_percentage)}%</span>
          </div>
          <div className="position-item">
            <span className="position-label">Progresso Breakeven</span>
            <span className="position-value">{formatNumber(userPosition.breakeven_progress)}%</span>
          </div>
        </div>
      </div>

      {/* Purchase Interface */}
      <div className="purchase-card">
        <h3>💰 Comprar Poder de Mineração (TH)</h3>
        
        <div className="purchase-form">
          <div className="input-group">
            <label>Quantidade de TH:</label>
            <input
              type="number"
              placeholder="20"
              value={purchaseTH}
              onChange={(e) => setPurchaseTH(e.target.value)}
              min={params.entrada_minima_th}
              step="1"
            />
          </div>
          
          <div className="purchase-summary">
            <div className="summary-grid">
              <div className="summary-item">
                <span>TH a comprar:</span>
                <span>{purchaseTH || '0'} TH</span>
              </div>
              <div className="summary-item">
                <span>Custo total:</span>
                <span>{formatCurrency(calculatePurchaseCost(parseFloat(purchaseTH || '0')), 'USDC')}</span>
              </div>
              <div className="summary-item">
                <span>Ganho diário:</span>
                <span>{formatCurrency(calculateDailyEarnings(parseFloat(purchaseTH || '0')), 'USDC')}</span>
              </div>
              <div className="summary-item">
                <span>Ganho mensal:</span>
                <span>{formatCurrency(calculateMonthlyEarnings(parseFloat(purchaseTH || '0')), 'USDC')}</span>
              </div>
              <div className="summary-item">
                <span>ROI anual:</span>
                <span>{formatNumber(calculateAnnualROI(parseFloat(purchaseTH || '0')))}%</span>
              </div>
              <div className="summary-item">
                <span>Breakeven (com DeFi):</span>
                <span>{formatNumber(calculateBreakevenDays(parseFloat(purchaseTH || '0'), true) / 30, 1)} meses</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handlePurchaseTH}
            disabled={isLoading || !purchaseTH || parseFloat(purchaseTH) < params.entrada_minima_th}
            className="purchase-button"
          >
            {isLoading ? 'Comprando...' : `Comprar ${purchaseTH || '0'} TH`}
          </button>
        </div>
      </div>

      {/* DeFi Integration */}
      <div className="defi-card">
        <h3>🏦 Integração DeFi - Reinvestimento Automático</h3>
        <div className="defi-stats">
          <div className="defi-item">
            <span className="defi-label">Rendimento DeFi/dia:</span>
            <span className="defi-value">{formatCurrency(params.reinvestimento_defi_diario, 'USDC')}</span>
          </div>
          <div className="defi-item">
            <span className="defi-label">TH comprado/mês (DeFi):</span>
            <span className="defi-value">{formatNumber(params.crescimento_th_mensal)} TH</span>
          </div>
          <div className="defi-item">
            <span className="defi-label">Protocolo:</span>
            <span className="defi-value">Aave V3 + Aerodrome</span>
          </div>
          <div className="defi-item">
            <span className="defi-label">Colateral:</span>
            <span className="defi-value">cbBTC</span>
          </div>
        </div>
        
        <div className="defi-explanation">
          <h4>Como funciona o reinvestimento:</h4>
          <ul>
            <li>💰 Você recebe 100% do lucro de mineração (${params.lucro_diario_base}/TH/dia)</li>
            <li>🏦 Adicionalmente, ${params.reinvestimento_defi_diario}/dia via lending DeFi</li>
            <li>🔄 Rendimento DeFi é usado para comprar mais TH automaticamente</li>
            <li>📈 Crescimento composto: +{params.crescimento_th_mensal} TH/mês</li>
            <li>⚡ Reduz breakeven de {params.breakeven_meses} para {params.breakeven_defi_meses} meses</li>
          </ul>
        </div>
      </div>

      {/* Equipment Details */}
      <div className="equipment-card">
        <h3>🔧 Especificações do Equipamento</h3>
        <div className="equipment-details">
          <div className="equipment-item">
            <span className="equipment-label">Modelo:</span>
            <span className="equipment-value">Bitmain Antminer S21+</span>
          </div>
          <div className="equipment-item">
            <span className="equipment-label">Hashrate total:</span>
            <span className="equipment-value">216 TH/s</span>
          </div>
          <div className="equipment-item">
            <span className="equipment-label">Consumo:</span>
            <span className="equipment-value">3,510W</span>
          </div>
          <div className="equipment-item">
            <span className="equipment-label">Custo equipamento:</span>
            <span className="equipment-value">$7,170 USD</span>
          </div>
          <div className="equipment-item">
            <span className="equipment-label">Localização:</span>
            <span className="equipment-value">Paraguai</span>
          </div>
          <div className="equipment-item">
            <span className="equipment-label">Custo energia:</span>
            <span className="equipment-value">$0.07/kWh</span>
          </div>
          <div className="equipment-item">
            <span className="equipment-label">Markup operacional:</span>
            <span className="equipment-value">5%</span>
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
        .business-model-dashboard {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1400px;
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
        
        .parameters-card, .position-card, .purchase-card, .defi-card, .equipment-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
        }
        
        .parameters-card {
          background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
          color: white;
        }
        
        .parameters-card h3, .position-card h3, .purchase-card h3, .defi-card h3, .equipment-card h3 {
          margin: 0 0 20px 0;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .params-grid, .position-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }
        
        .param-item, .position-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }
        
        .position-item {
          background: #f8fafc;
          color: #1f2937;
        }
        
        .position-item.highlight {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        
        .param-label, .position-label {
          font-weight: 500;
          font-size: 0.9rem;
        }
        
        .param-value, .position-value {
          font-weight: 700;
          font-size: 1rem;
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
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          font-weight: 500;
          padding: 4px 0;
        }
        
        .purchase-button {
          background: #10b981;
          border: none;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .purchase-button:hover:not(:disabled) {
          background: #059669;
          transform: translateY(-1px);
        }
        
        .purchase-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        
        .defi-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .defi-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f0fdf4;
          border-radius: 8px;
          border: 1px solid #bbf7d0;
        }
        
        .defi-label {
          color: #166534;
          font-weight: 500;
        }
        
        .defi-value {
          color: #15803d;
          font-weight: 700;
        }
        
        .defi-explanation {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 16px;
        }
        
        .defi-explanation h4 {
          margin: 0 0 12px 0;
          color: #92400e;
        }
        
        .defi-explanation ul {
          margin: 0;
          padding-left: 20px;
          color: #78350f;
        }
        
        .defi-explanation li {
          margin-bottom: 6px;
        }
        
        .equipment-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        
        .equipment-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        
        .equipment-label {
          color: #475569;
          font-weight: 500;
        }
        
        .equipment-value {
          color: #1e293b;
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
          .business-model-dashboard {
            padding: 16px;
          }
          
          .dashboard-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
          
          .params-grid, .position-grid, .summary-grid, .defi-stats, .equipment-details {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};