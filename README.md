# ⚡ ASIC S21+ Tokenization DApp

Um mini-aplicativo inovador construído na **Base Network** que tokeniza uma **máquina de mineração Antminer S21+** real, permitindo comprar frações de **20 TH/s** com **ROI diário de $1 USD** por fração.

## 🌟 Funcionalidades Principais

### ⚡ Tokenização ASIC Real
- **Antminer S21+**: Máquina real com 216 TH/s total de hashrate
- **Frações de 20 TH/s**: Cada token representa 20 TH/s (~9.26% da máquina)
- **ROI Diário**: $1 USD por fração de 20 TH/s por dia
- **Transparência Total**: Propriedade fracionária verificável on-chain

### 🏦 Integração DeFi com Aave
- **Yield Automático**: cbBTC automaticamente depositado na Aave V3
- **Rendimento Composto**: Mineração + yield DeFi da Aave
- **Liquidez Flexível**: Withdraw/deposit a qualquer momento

### 🔗 Integração Base Network
- **Coinbase Wallet**: Integração nativa exclusiva
- **Baixas Taxas**: Transações < $0.01 na Base Network
- **Chainlink Oracles**: Dados de preços BTC em tempo real

## 🛠️ Stack Tecnológico

### Blockchain
- **Base Network** (Ethereum L2)
- **Solidity 0.8.19** para smart contracts
- **Hardhat** para desenvolvimento e deploy
- **OpenZeppelin** para padrões de segurança

### Integrações Web3
- **cbBTC Token** (Coinbase Wrapped Bitcoin)
- **Chainlink Oracles** para preços e dados
- **Aave V3 Protocol** para yield farming
- **Coinbase Wallet SDK** para conectividade

### Frontend
- **React 18** com TypeScript
- **Web3.js** para interação blockchain
- **Coinbase Wallet SDK** integração exclusiva
- **CSS-in-JS** para estilização

## 📁 Estrutura do Projeto

```
mining-cbbtc-dapp/
├── contracts/                     # Smart Contracts
│   ├── MiningPool.sol             # Pool principal de mineração
│   ├── cbBTCMiningToken.sol       # Token de mineração ERC-20
│   ├── ChainlinkOracle.sol        # Integração Chainlink
│   ├── AaveIntegration.sol        # Integração Aave V3
│   └── interfaces/                # Interfaces dos contratos
├── frontend/                      # Aplicação React
│   └── src/
│       ├── components/            # Componentes React
│       ├── hooks/                 # React Hooks customizados
│       ├── services/              # Serviços Web3
│       └── utils/                 # Utilitários
├── scripts/                       # Scripts de deploy
└── test/                         # Testes automatizados
```

## 🚀 Configuração e Deploy

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Carteira com ETH na Base Network
- Chaves de API (Basescan, Alchemy/Infura)

### 1. Instalação
```bash
# Clone o repositório
git clone <repository-url>
cd mining-cbbtc-dapp

# Instalar dependências
npm install
cd frontend && npm install
```

### 2. Configuração
```bash
# Copiar arquivo de ambiente
cp .env.example .env

# Configurar variáveis:
# PRIVATE_KEY=sua_private_key
# BASESCAN_API_KEY=sua_api_key
# CHAINLINK_BTC_USD_FEED=0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69
# AAVE_V3_POOL_ADDRESS=0xA238Dd80C259a72e81d7e4664a9801593F98d1c5
# CBBTC_TOKEN_ADDRESS=0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf
```

### 3. Deploy dos Contratos
```bash
# Compilar contratos
npx hardhat compile

# Deploy na Base Sepolia (testnet)
npx hardhat run scripts/deploy.ts --network base_sepolia

# Deploy na Base Mainnet
npx hardhat run scripts/deploy.ts --network base
```

### 4. Configurar Frontend
```bash
# Atualizar endereços dos contratos no frontend
# Editar frontend/src/hooks/useWeb3.ts com endereços deployados
```

## 💡 Como Usar

### 1. Conectar Carteira
- Abrir aplicação
- Clicar em \"Connect Coinbase Wallet\"
- Confirmar conexão e trocar para Base Network

### 2. Stakear cbBTC
- Inserir quantidade de cbBTC para stake
- Aprovar transação de allowance
- Confirmar transação de stake
- Receber tokens de mineração proporcionalmente

### 3. Yield Farming Automático
- cbBTC automaticamente depositado na Aave
- Geração de yield adicional via Aave
- Visualização de rendimentos em tempo real

### 4. Claim de Recompensas
- Verificar recompensas pendentes
- Fazer claim de tokens de mineração
- Fazer claim de yield Aave

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npx hardhat compile                # Compilar contratos
npx hardhat test                  # Executar testes
npx hardhat node                  # Node local
npx hardhat console --network base # Console Base Network

# Frontend
cd frontend
npm start                         # Desenvolvimento
npm run build                    # Build produção
npm run lint                     # Linting
```

## 📊 Modelo de Negócio - Parâmetros Reais

### 💰 Investimento Inicial
- **Entrada Mínima**: 20 TH = US$700 (US$35/TH)
- **Equipamento**: Bitmain Antminer S21+ (216 TH total)
- **Localização**: Paraguai (energia barata)
- **Markup Operacional**: 5%

### 📈 Retorno de Investimento
- **Lucro Diário**: US$1,50/dia por pacote de 20 TH
- **Lucro por TH**: US$0,075/TH/dia
- **ROI Anual**: 77%
- **Breakeven**: 15,5 meses (sem DeFi)
- **Breakeven com DeFi**: 13,6 meses

### 🏦 Integração DeFi
- **Rendimento Adicional**: +US$0,50/dia via Aave/Aerodrome
- **Reinvestimento**: Automático em mais TH
- **Crescimento**: +0,429 TH/mês via DeFi
- **Colateral**: cbBTC tokenizado

### ⚡ Especificações Técnicas
- **Modelo**: Bitmain Antminer S21+
- **Hashrate**: 216 TH/s total
- **Consumo**: 3,510W
- **Custo Energia**: US$0,07/kWh
- **Algoritmo**: SHA-256

## 🌐 Endereços de Contratos (Base Network)

### Contratos Externos
- **cbBTC Token**: `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf`
- **Chainlink BTC/USD**: `0x56a43EB56Da12C0dc1D972ACb089c06a5dEF8e69`
- **Aave V3 Pool**: `0xA238Dd80C259a72e81d7e4664a9801593F98d1c5`

*Endereços dos contratos deployados serão atualizados após o deploy*

## 🔒 Segurança

### Práticas Implementadas
- **OpenZeppelin**: Contratos auditados e padrões de segurança
- **ReentrancyGuard**: Proteção contra ataques de reentrância
- **Pausable**: Capacidade de pausar em emergências
- **Access Control**: Permissões granulares
- **Chainlink**: Oráculos descentralizados confiáveis

### Auditorias
- Contratos baseados em padrões OpenZeppelin
- Integração com protocolos battle-tested (Aave, Chainlink)
- Testes automatizados para funções críticas

## 📈 Métricas e Analytics

### Dashboard em Tempo Real
- Preço BTC via Chainlink
- Total Value Locked (TVL)
- Recompensas de mineração acumuladas
- Yield Aave gerado
- Hashrate e performance da pool

### Transparência
- Todas as transações on-chain
- Histórico de recompensas auditável
- Métricas de performance públicas

## 🎯 Roadmap Futuro

### Fase 2 - Expansão
- [ ] Múltiplas pools de mineração
- [ ] Integração com mais protocolos DeFi
- [ ] Governance token
- [ ] Dashboard de analytics avançado

### Fase 3 - Otimização
- [ ] Layer 2 gas optimizations
- [ ] Flash loans integration
- [ ] Cross-chain bridges
- [ ] Mobile app

## 🤝 Contribuição

### Para Desenvolvedores
1. Fork o repositório
2. Criar branch para feature (`git checkout -b feature/nova-feature`)
3. Commit das mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para branch (`git push origin feature/nova-feature`)
5. Criar Pull Request

### Reportar Bugs
- Abrir issue detalhando o problema
- Incluir steps para reproduzir
- Adicionar screenshots se relevante
- Especificar ambiente (browser, network, etc.)

## 📄 Licença

MIT License - veja arquivo [LICENSE](LICENSE) para detalhes.

## 🏆 Hackathon Submission

Este projeto foi desenvolvido para hackathon com foco em:
- **Inovação**: Tokenização de mineração Bitcoin
- **DeFi Integration**: Yield farming automático via Aave
- **Base Network**: Aproveitando baixas taxas e velocidade
- **UX**: Interface simples e intuitiva
- **Sustainability**: Modelo econômico sustentável

---

**Desenvolvido com ❤️ para o ecossistema Base Network**

*Para suporte: [GitHub Issues](../../issues)*