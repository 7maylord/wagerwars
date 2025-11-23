# WagerWars Architecture Plan
## Polymarket-Style Prediction Market on Stacks Bitcoin L2

**Version**: 1.0
**Date**: 2025-11-23
**Target**: Production-ready prediction market leveraging sBTC and Clarity smart contracts

---

## Executive Summary

WagerWars will be a decentralized prediction market built on Stacks (Bitcoin L2) that allows users to:
- Create and participate in prediction markets on sports, politics, crypto, and custom events
- Use sBTC (1:1 Bitcoin-backed asset) for all wagers
- Benefit from Bitcoin's security with 100% Bitcoin finality
- Earn yields through market making and liquidity provision
- Resolve markets through decentralized oracle integration

**Current Status**: Landing page + waitlist ✅ | Smart contracts 🚧 | dApp integration ❌

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Smart Contract Architecture](#smart-contract-architecture)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend & Infrastructure](#backend--infrastructure)
5. [Data Models](#data-models)
6. [User Flows](#user-flows)
7. [Security Considerations](#security-considerations)
8. [Implementation Roadmap](#implementation-roadmap)

---

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Market       │  │ Trading      │  │ Portfolio    │      │
│  │ Discovery    │  │ Interface    │  │ Dashboard    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│  Stacks.js  │  │   Supabase   │  │   Oracle     │
│  Wallet     │  │   Backend    │  │   Service    │
│  Connect    │  │   (Cache)    │  │   (APIs)     │
└──────┬──────┘  └──────────────┘  └──────┬───────┘
       │                                   │
       │         Stacks Blockchain         │
       │    ┌─────────────────────┐       │
       │    │  Clarity Contracts  │       │
       └───►│  • Market Manager   │◄──────┘
            │  • Order Book       │
            │  • sBTC Handler     │
            │  • Oracle Bridge    │
            │  • Vault/Escrow     │
            └─────────────────────┘
                      │
                      ▼
            ┌─────────────────┐
            │  Bitcoin L1     │
            │  (sBTC Peg)     │
            └─────────────────┘
```

### Technology Stack

**Blockchain Layer**
- **Smart Contracts**: Clarity 3 (decidable, secure by design)
- **Blockchain**: Stacks Bitcoin L2
- **Asset**: sBTC (1:1 Bitcoin-backed fungible token)
- **Token Standard**: SIP-010 for fungible tokens
- **Development**: Clarinet SDK 3.6.0 + Vitest
- **Testing**: Local Devnet with 9 test wallets

**Frontend Layer**
- **Framework**: Next.js 16 (App Router) + React 19
- **Wallet**: Stacks.js + Leather/Hiro Wallet integration
- **Styling**: Tailwind CSS with cyberpunk theme
- **State**: React Context + SWR for data fetching
- **Charts**: Recharts or Lightweight Charts for price graphs
- **Real-time**: WebSocket for live market updates

**Backend/Infrastructure**
- **Database**: Supabase (PostgreSQL) for caching & analytics
- **Cron Jobs**: Vercel Cron for market resolution checks
- **Oracle**: Chainlink-style oracle or custom API aggregator
- **Analytics**: Indexer for blockchain events
- **IPFS**: Market metadata and images

---

## Smart Contract Architecture

### Core Contracts Overview

We'll implement a modular contract system following Clarity best practices:

#### 1. **market-manager.clar** (Main Contract)
The central coordinator for all prediction markets.

**Responsibilities**:
- Create new prediction markets
- Store market metadata (question, outcomes, deadline, resolution time)
- Track market status (open, locked, resolved, cancelled)
- Manage market resolution
- Calculate and distribute winnings
- Enforce market creation fees and oracle bonds

**Key Data Structures**:
```clarity
;; Market structure
(define-map markets
  { market-id: uint }
  {
    creator: principal,
    question: (string-ascii 256),
    outcome-count: uint,
    resolution-time: uint,
    lock-time: uint,
    oracle: principal,
    total-volume: uint,
    resolved-outcome: (optional uint),
    status: (string-ascii 10), ;; "open", "locked", "resolved", "cancelled"
    metadata-uri: (optional (string-ascii 256))
  }
)

;; Market outcomes
(define-map market-outcomes
  { market-id: uint, outcome-id: uint }
  {
    name: (string-ascii 64),
    total-staked: uint,
    share-supply: uint
  }
)
```

**Key Functions**:
- `create-market(question, outcomes, resolution-time, oracle)` - Create new market
- `resolve-market(market-id, winning-outcome)` - Oracle resolves market
- `cancel-market(market-id)` - Creator cancels invalid market
- `claim-winnings(market-id)` - Users claim after resolution

---

#### 2. **order-book.clar** (Trading Engine)
Implements an automated market maker (AMM) using constant product formula (x * y = k) or LMSR.

**Responsibilities**:
- Handle buy/sell orders for market shares
- Calculate pricing using bonding curve
- Manage liquidity pools per market outcome
- Track user positions

**Pricing Model Options**:

**Option A: Constant Product AMM (Uniswap-style)**
- Simple to implement
- Each outcome has a liquidity pool
- Price = outcome_pool / (yes_pool + no_pool)

**Option B: Logarithmic Market Scoring Rule (LMSR)**
- Used by real prediction markets
- Better for low-liquidity markets
- More complex math in Clarity

**Recommended**: Start with Constant Product AMM, migrate to LMSR v2

**Key Data Structures**:
```clarity
;; Liquidity pools per market outcome
(define-map liquidity-pools
  { market-id: uint, outcome-id: uint }
  {
    sbtc-reserve: uint,
    share-reserve: uint,
    k-constant: uint ;; x * y = k
  }
)

;; User positions
(define-map user-positions
  { user: principal, market-id: uint, outcome-id: uint }
  {
    shares: uint,
    avg-price: uint
  }
)
```

**Key Functions**:
- `buy-shares(market-id, outcome-id, sbtc-amount)` - Buy market shares
- `sell-shares(market-id, outcome-id, share-amount)` - Sell shares back
- `calculate-buy-price(market-id, outcome-id, amount)` - Read-only pricing
- `calculate-sell-price(market-id, outcome-id, amount)` - Read-only pricing
- `get-user-position(user, market-id, outcome-id)` - Read-only position

---

#### 3. **vault.clar** (Escrow & Settlement)
Secure vault for holding sBTC collateral and distributing winnings.

**Responsibilities**:
- Hold all market collateral in escrow
- Distribute winnings after resolution
- Handle refunds for cancelled markets
- Track protocol fees

**Key Data Structures**:
```clarity
;; Vault balances per market
(define-map market-balances
  { market-id: uint }
  {
    total-locked: uint,
    fees-collected: uint
  }
)

;; User claimable winnings
(define-map claimable-winnings
  { user: principal, market-id: uint }
  { amount: uint }
)
```

**Key Functions**:
- `deposit-collateral(market-id, amount)` - Private function called by order-book
- `release-winnings(market-id, user)` - Distribute after resolution
- `refund-cancelled(market-id, user)` - Refund on cancellation
- `collect-protocol-fees()` - Owner withdraws fees

---

#### 4. **oracle-bridge.clar** (Oracle Integration)
Interface between external oracle data and smart contracts.

**Responsibilities**:
- Register authorized oracles
- Accept oracle resolution data
- Implement dispute mechanism
- Slash oracle bonds for bad data

**Key Data Structures**:
```clarity
;; Authorized oracles
(define-map oracles
  { oracle: principal }
  {
    bond-amount: uint,
    resolution-count: uint,
    dispute-count: uint,
    active: bool
  }
)

;; Market oracle assignments
(define-map market-oracles
  { market-id: uint }
  {
    oracle: principal,
    resolution-deadline: uint,
    resolved: bool
  }
)
```

**Key Functions**:
- `register-oracle(bond-amount)` - Become an oracle (stake bond)
- `submit-resolution(market-id, outcome-id)` - Oracle submits result
- `dispute-resolution(market-id)` - Challenge incorrect resolution
- `slash-oracle(oracle)` - Penalize for bad data

---

#### 5. **sbtc-token.clar** (Token Interface)
Wrapper/interface for sBTC SIP-010 token interactions.

**Responsibilities**:
- Implement SIP-010 trait for sBTC
- Handle token transfers
- Track allowances and balances

**Note**: sBTC will have its own deployed contract on mainnet. This contract will interface with it.

**Key Functions**:
```clarity
(use-trait ft-trait .sip010-ft-trait.sip010-ft-trait)

;; Transfer sBTC from user to contract
(define-public (transfer-to-vault (amount uint) (sender principal))
  (contract-call? .sbtc-token transfer amount sender (as-contract tx-sender) none)
)

;; Transfer sBTC from contract to user
(define-public (transfer-from-vault (amount uint) (recipient principal))
  (as-contract (contract-call? .sbtc-token transfer amount tx-sender recipient none))
)
```

---

### Contract Interaction Flow

**Market Creation Flow**:
```
User → market-manager.create-market()
  → oracle-bridge.assign-oracle()
  → market-manager emits event
  → Frontend indexes new market
```

**Trading Flow**:
```
User → order-book.buy-shares(market-id, outcome, amount)
  → sbtc-token.transfer-to-vault(amount)
  → order-book.calculate-price()
  → order-book.mint-shares()
  → vault.deposit-collateral()
  → order-book emits trade event
```

**Resolution Flow**:
```
Oracle → oracle-bridge.submit-resolution(market-id, outcome)
  → market-manager.resolve-market(outcome)
  → vault.calculate-payouts()
  → market-manager emits resolution event
  → Users call vault.claim-winnings()
```

---

### Clarity Code Snippets

**Example: Buy Shares Function**

```clarity
;; Buy shares for a specific outcome
(define-public (buy-shares (market-id uint) (outcome-id uint) (sbtc-amount uint))
  (let (
    (market (unwrap! (map-get? markets {market-id: market-id}) ERR-MARKET-NOT-FOUND))
    (pool (unwrap! (map-get? liquidity-pools {market-id: market-id, outcome-id: outcome-id}) ERR-POOL-NOT-FOUND))
    (shares-to-mint (calculate-shares-out (get sbtc-reserve pool) (get share-reserve pool) sbtc-amount))
  )
    ;; Check market is open
    (asserts! (is-eq (get status market) "open") ERR-MARKET-NOT-OPEN)

    ;; Transfer sBTC to vault
    (try! (contract-call? .sbtc-token transfer sbtc-amount tx-sender (as-contract tx-sender) none))

    ;; Update pool reserves
    (map-set liquidity-pools
      {market-id: market-id, outcome-id: outcome-id}
      (merge pool {
        sbtc-reserve: (+ (get sbtc-reserve pool) sbtc-amount),
        share-reserve: (- (get share-reserve pool) shares-to-mint)
      })
    )

    ;; Update user position
    (update-user-position tx-sender market-id outcome-id shares-to-mint sbtc-amount)

    ;; Emit event
    (print {event: "shares-bought", user: tx-sender, market-id: market-id, outcome-id: outcome-id, shares: shares-to-mint})

    (ok shares-to-mint)
  )
)

;; Calculate shares using constant product formula
(define-read-only (calculate-shares-out (sbtc-reserve uint) (share-reserve uint) (sbtc-in uint))
  (let (
    (new-sbtc-reserve (+ sbtc-reserve sbtc-in))
    (k-constant (* sbtc-reserve share-reserve))
    (new-share-reserve (/ k-constant new-sbtc-reserve))
  )
    (- share-reserve new-share-reserve)
  )
)
```

---

## Frontend Architecture

### Application Structure

```
frontend/
├── app/
│   ├── (marketing)/          # Public pages
│   │   ├── page.tsx         # Landing page ✅
│   │   └── about/
│   ├── (dapp)/              # Authenticated app
│   │   ├── markets/         # Market discovery
│   │   │   ├── page.tsx     # Browse all markets
│   │   │   └── [id]/        # Market detail + trading
│   │   ├── portfolio/       # User positions
│   │   ├── create/          # Create market
│   │   └── leaderboard/     # Top traders
│   └── api/
│       ├── markets/         # Cache & indexer API
│       ├── oracle/          # Oracle data feed
│       └── waitlist/        # Existing ✅
├── components/
│   ├── market/
│   │   ├── MarketCard.tsx
│   │   ├── OrderBook.tsx
│   │   ├── PriceChart.tsx
│   │   └── TradingPanel.tsx
│   ├── wallet/
│   │   ├── WalletConnect.tsx
│   │   └── BalanceDisplay.tsx
│   └── ui/                  # Existing ✅
├── lib/
│   ├── stacks/
│   │   ├── contracts.ts     # Contract calls
│   │   ├── wallet.ts        # Wallet connection
│   │   └── transactions.ts  # TX helpers
│   ├── supabase.ts          # Existing ✅
│   └── oracle.ts            # Oracle integration
└── hooks/
    ├── useMarkets.ts        # Fetch markets
    ├── useWallet.ts         # Wallet state
    └── useTrading.ts        # Trading logic
```

---

### Key Frontend Features

#### 1. **Wallet Integration**
Use Stacks.js and connect to Leather/Hiro Wallet.

```typescript
// lib/stacks/wallet.ts
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksMainnet } from '@stacks/network';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export function connectWallet() {
  showConnect({
    appDetails: {
      name: 'WagerWars',
      icon: '/logo.svg',
    },
    onFinish: () => {
      window.location.reload();
    },
    userSession,
  });
}

export function getAddress() {
  return userSession.loadUserData()?.profile?.stxAddress?.mainnet;
}
```

---

#### 2. **Market Discovery Page**

```typescript
// app/(dapp)/markets/page.tsx
import { MarketCard } from '@/components/market/MarketCard';
import { useMarkets } from '@/hooks/useMarkets';

export default function MarketsPage() {
  const { markets, loading } = useMarkets({ status: 'open' });

  return (
    <div className="container py-8">
      <h1>Active Markets</h1>
      <div className="grid grid-cols-3 gap-6">
        {markets.map(market => (
          <MarketCard key={market.id} market={market} />
        ))}
      </div>
    </div>
  );
}
```

---

#### 3. **Trading Interface**

```typescript
// components/market/TradingPanel.tsx
'use client';

import { useState } from 'react';
import { buyShares } from '@/lib/stacks/contracts';
import { useWallet } from '@/hooks/useWallet';

export function TradingPanel({ marketId, outcomeId }: Props) {
  const [amount, setAmount] = useState('');
  const { address } = useWallet();

  const handleBuy = async () => {
    const tx = await buyShares(marketId, outcomeId, parseFloat(amount));
    // Show pending TX toast
  };

  return (
    <div className="border rounded-lg p-6">
      <h3>Buy Shares</h3>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in sBTC"
      />
      <button onClick={handleBuy}>Buy</button>
    </div>
  );
}
```

---

#### 4. **Contract Interaction Layer**

```typescript
// lib/stacks/contracts.ts
import {
  makeContractCall,
  uintCV,
  principalCV,
  PostConditionMode
} from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

const network = new StacksMainnet();
const CONTRACT_ADDRESS = 'SP...'; // Deploy address
const CONTRACT_NAME = 'order-book';

export async function buyShares(
  marketId: number,
  outcomeId: number,
  sbtcAmount: number
) {
  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'buy-shares',
    functionArgs: [
      uintCV(marketId),
      uintCV(outcomeId),
      uintCV(sbtcAmount * 1e6) // Convert to micro-units
    ],
    network,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [], // Add post-conditions for safety
  };

  return await makeContractCall(txOptions);
}
```

---

### UI/UX Features

**Market Card Design**:
- Question/title
- Current odds for each outcome
- Volume, liquidity, time until lock
- Outcome probability chart (pie/bar)

**Trading Interface**:
- Buy/sell toggle
- Outcome selector (Yes/No or multi-outcome)
- Amount input with sBTC balance
- Estimated shares to receive
- Price impact warning
- Slippage tolerance

**Portfolio Dashboard**:
- Open positions by market
- Total value (unrealized P&L)
- Claimable winnings
- Transaction history

---

## Backend & Infrastructure

### Supabase Database Schema

**Purpose**: Cache blockchain data for fast querying and analytics.

#### Tables

**1. markets**
```sql
CREATE TABLE markets (
  id BIGINT PRIMARY KEY,
  contract_address TEXT NOT NULL,
  creator TEXT NOT NULL,
  question TEXT NOT NULL,
  outcome_count INT NOT NULL,
  resolution_time TIMESTAMPTZ NOT NULL,
  lock_time TIMESTAMPTZ NOT NULL,
  oracle TEXT,
  total_volume NUMERIC DEFAULT 0,
  resolved_outcome INT,
  status TEXT CHECK (status IN ('open', 'locked', 'resolved', 'cancelled')),
  metadata_uri TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_creator ON markets(creator);
```

**2. outcomes**
```sql
CREATE TABLE outcomes (
  id SERIAL PRIMARY KEY,
  market_id BIGINT REFERENCES markets(id),
  outcome_id INT NOT NULL,
  name TEXT NOT NULL,
  total_staked NUMERIC DEFAULT 0,
  share_supply NUMERIC DEFAULT 0,
  current_price NUMERIC,
  UNIQUE(market_id, outcome_id)
);
```

**3. positions**
```sql
CREATE TABLE positions (
  id SERIAL PRIMARY KEY,
  user_address TEXT NOT NULL,
  market_id BIGINT REFERENCES markets(id),
  outcome_id INT NOT NULL,
  shares NUMERIC NOT NULL,
  avg_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_address, market_id, outcome_id)
);

CREATE INDEX idx_positions_user ON positions(user_address);
```

**4. trades**
```sql
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  tx_id TEXT UNIQUE NOT NULL,
  market_id BIGINT REFERENCES markets(id),
  user_address TEXT NOT NULL,
  outcome_id INT NOT NULL,
  trade_type TEXT CHECK (trade_type IN ('buy', 'sell')),
  shares NUMERIC NOT NULL,
  sbtc_amount NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  block_height BIGINT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_market ON trades(market_id);
CREATE INDEX idx_trades_user ON trades(user_address);
```

**5. oracle_resolutions**
```sql
CREATE TABLE oracle_resolutions (
  id SERIAL PRIMARY KEY,
  market_id BIGINT REFERENCES markets(id) UNIQUE,
  oracle_address TEXT NOT NULL,
  winning_outcome INT NOT NULL,
  tx_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Event Indexer

Build a service that monitors Stacks blockchain for contract events and indexes to Supabase.

```typescript
// lib/indexer/market-indexer.ts
import { StacksMainnet } from '@stacks/network';
import { cvToJSON } from '@stacks/transactions';

export async function indexMarketEvents(startBlock: number) {
  const network = new StacksMainnet();

  // Fetch contract events
  const events = await fetchContractEvents(
    CONTRACT_ADDRESS,
    'market-manager',
    startBlock
  );

  for (const event of events) {
    const eventData = cvToJSON(event.contract_event.value);

    if (eventData.event === 'market-created') {
      await supabase.from('markets').insert({
        id: eventData.market_id,
        creator: eventData.creator,
        question: eventData.question,
        // ... other fields
      });
    }

    if (eventData.event === 'shares-bought') {
      await supabase.from('trades').insert({
        tx_id: event.tx_id,
        market_id: eventData.market_id,
        user_address: eventData.user,
        trade_type: 'buy',
        // ... other fields
      });
    }
  }
}
```

Run this as a cron job (every 1-5 minutes) using Vercel Cron or a separate service.

---

### Oracle Service

**Phase 1: Centralized Oracle (MVP)**
- Run a trusted backend service
- Fetch data from sports APIs (ESPN, The Odds API)
- Submit resolutions on-chain
- Stake oracle bond for accountability

**Phase 2: Decentralized Oracle (Production)**
- Multiple oracle providers
- Consensus mechanism (majority vote)
- Dispute period for challenges
- Slashing for incorrect data

```typescript
// lib/oracle/resolver.ts
export async function resolveMarket(marketId: number) {
  // Fetch market details
  const market = await getMarket(marketId);

  // Fetch outcome from data source
  const result = await fetchSportsResult(market.metadata.gameId);

  // Submit resolution on-chain
  const tx = await submitResolution(marketId, result.winningOutcome);

  // Update database
  await supabase.from('markets').update({
    status: 'resolved',
    resolved_outcome: result.winningOutcome
  }).eq('id', marketId);
}
```

---

## Data Models

### Market Types

**Binary Markets** (Yes/No)
- Simple: "Will BTC hit $100k by Jan 2026?"
- Two outcomes: Yes, No

**Categorical Markets** (Multi-outcome)
- "Who will win the Super Bowl?" (32 teams)
- Multiple mutually exclusive outcomes

**Scalar Markets** (Range)
- "What will BTC price be on Dec 31?" ($50k-$150k)
- Bet on ranges, continuous outcomes

**Recommendation**: Start with Binary, add Categorical in v2, Scalar in v3.

---

### Market Metadata

Store extended market data on IPFS or Supabase:

```typescript
interface MarketMetadata {
  title: string;
  description: string;
  category: 'sports' | 'politics' | 'crypto' | 'custom';
  imageUrl?: string;
  dataSource?: string; // For oracle
  tags: string[];
  externalLinks?: {
    source: string;
    url: string;
  }[];
}
```

---

## User Flows

### 1. Create Market Flow

```
1. User connects wallet (Leather/Hiro)
2. Navigates to /create
3. Fills form:
   - Question
   - Outcomes (2+ options)
   - Resolution time
   - Lock time (when trading stops)
   - Oracle selection
   - Initial liquidity (optional)
4. Pays market creation fee (e.g., 10 STX)
5. Transaction sent to market-manager.create-market()
6. Market appears on /markets after indexing
```

**Form Validation**:
- Question: 10-256 chars
- Outcomes: 2-10 options
- Resolution time: > lock time
- Lock time: > current time + 1 hour

---

### 2. Trade Flow

```
1. User browses /markets
2. Clicks on market card
3. Sees market details:
   - Question, outcomes, odds
   - Trading chart (historical prices)
   - Order book depth
4. Selects outcome (Yes/No or choice)
5. Enters sBTC amount to wager
6. Sees estimated shares and price impact
7. Clicks "Buy Shares"
8. Wallet prompts for confirmation
9. Transaction broadcasts
10. Position appears in portfolio
```

---

### 3. Resolution & Claim Flow

```
1. Market lock time passes → trading disabled
2. Oracle fetches result from data source
3. Oracle calls oracle-bridge.submit-resolution()
4. Market status → "resolved"
5. Frontend shows winning outcome
6. Users with winning positions see "Claim" button
7. User clicks "Claim Winnings"
8. vault.release-winnings() transfers sBTC + yield
9. Position marked as claimed
```

---

### 4. Portfolio Management

```
1. User navigates to /portfolio
2. Sees tabs:
   - Open Positions (active markets)
   - Pending Claims (resolved, unclaimed)
   - History (closed positions)
3. Can sell shares early (if market still open)
4. Can claim multiple markets in one batch
```

---

## Security Considerations

### Smart Contract Security

**1. Reentrancy Protection**
- Clarity disallows reentrancy by design ✅
- No need for ReentrancyGuard like Solidity

**2. Integer Overflow/Underflow**
- Clarity aborts transactions on overflow ✅
- Use u128 for large numbers (sBTC amounts)

**3. Access Control**
- Use `tx-sender` checks for authorization
- `contract-owner` for admin functions
- Oracle whitelist for resolution

**4. Post-Conditions**
- Require users to set post-conditions for all transfers
- Example: "I must receive at least X shares for Y sBTC"

**5. Pausability**
- Emergency pause function for critical bugs
- Only contract owner can pause
- Cannot pause mid-transaction

**Example**:
```clarity
(define-data-var contract-paused bool false)

(define-public (pause-contract)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)
    (var-set contract-paused true)
    (ok true)
  )
)

(define-read-only (is-paused)
  (var-get contract-paused)
)
```

---

### Oracle Security

**1. Multi-Oracle Consensus**
- Require 3/5 oracles to agree
- Slashing for minority oracles

**2. Time Locks**
- Delay between resolution submission and finalization
- Allows dispute period (e.g., 24 hours)

**3. Oracle Bonding**
- Oracles stake STX/sBTC as collateral
- Slashed if dispute succeeds

**4. Data Source Verification**
- Immutable data source URLs in market metadata
- Oracle cannot change source after creation

---

### Frontend Security

**1. Transaction Validation**
- Always calculate expected outcome client-side
- Compare with contract calculation
- Warn on significant price impact (>5%)

**2. Wallet Security**
- Never request private keys
- Use Stacks Connect for signing
- Show clear transaction details

**3. XSS/CSRF Protection**
- Next.js built-in protections ✅
- Sanitize user-generated content (market questions)
- CSP headers

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-3)

**Week 1: Smart Contract Foundation**
- [ ] Implement `market-manager.clar`
  - Market creation
  - Market resolution
  - Data structures
- [ ] Implement `sbtc-token.clar` interface
- [ ] Write comprehensive Clarinet tests
- [ ] Deploy to devnet

**Week 2: Trading Engine**
- [ ] Implement `order-book.clar`
  - AMM logic (constant product)
  - Buy/sell functions
  - Price calculation
- [ ] Implement `vault.clar`
  - Escrow management
  - Winnings distribution
- [ ] Integration tests
- [ ] Gas optimization

**Week 3: Oracle System**
- [ ] Implement `oracle-bridge.clar`
  - Oracle registration
  - Resolution submission
  - Dispute mechanism
- [ ] Build centralized oracle service
  - Sports API integration
  - Auto-resolution cron
- [ ] Test end-to-end resolution flow

---

### Phase 2: Frontend dApp (Weeks 4-6)

**Week 4: Wallet & Core UI**
- [ ] Stacks.js wallet integration
- [ ] Connect/disconnect flow
- [ ] sBTC balance display
- [ ] Transaction state management
- [ ] Basic layout & routing

**Week 5: Market Features**
- [ ] Market discovery page
- [ ] Market detail page
- [ ] Trading interface (buy shares)
- [ ] Price charts
- [ ] User portfolio page

**Week 6: Polish & UX**
- [ ] Transaction notifications
- [ ] Loading states
- [ ] Error handling
- [ ] Responsive design
- [ ] Animations & micro-interactions

---

### Phase 3: Indexer & Backend (Weeks 7-8)

**Week 7: Event Indexer**
- [ ] Set up Supabase schema
- [ ] Build Stacks event listener
- [ ] Index market creations
- [ ] Index trades
- [ ] Index resolutions

**Week 8: APIs & Optimization**
- [ ] REST API for markets
- [ ] WebSocket for real-time updates
- [ ] Caching layer
- [ ] Analytics dashboard
- [ ] Performance optimization

---

### Phase 4: Testing & Launch (Weeks 9-10)

**Week 9: Testing**
- [ ] End-to-end testing (Playwright)
- [ ] Smart contract audit (internal)
- [ ] Load testing
- [ ] Testnet deployment
- [ ] Beta user testing

**Week 10: Mainnet Launch**
- [ ] Deploy contracts to Stacks mainnet
- [ ] Deploy frontend to Vercel
- [ ] Set up monitoring & alerts
- [ ] Launch with 5-10 seed markets
- [ ] Marketing push (convert waitlist)

---

### Phase 5: Post-Launch Features (Weeks 11+)

**Short Term (Weeks 11-14)**
- [ ] Advanced order types (limit orders)
- [ ] Liquidity provider rewards
- [ ] Market categories & filters
- [ ] Social features (comments, tips)
- [ ] Mobile optimization

**Medium Term (Months 3-6)**
- [ ] Multi-outcome markets (categorical)
- [ ] Decentralized oracle network
- [ ] Governance token (DAO)
- [ ] API for developers
- [ ] Market analytics & leaderboards

**Long Term (6+ Months)**
- [ ] Scalar markets (price ranges)
- [ ] Conditional markets (combinatorial)
- [ ] Cross-chain bridges (Polygon, Ethereum)
- [ ] Mobile app (React Native)
- [ ] Institutional features (API, bulk trading)

---

## Key Metrics & KPIs

### Launch Metrics
- **Total Value Locked (TVL)**: sBTC in all markets
- **Markets Created**: # of active markets
- **Daily Active Users**: Unique wallets trading
- **Trading Volume**: Daily/weekly sBTC volume
- **Liquidity Depth**: Average pool size

### Success Criteria (Month 1)
- 50+ markets created
- $100k+ TVL in sBTC
- 500+ unique traders
- 10k+ trades executed
- <5% oracle disputes

---

## Risk Mitigation

### Technical Risks
- **sBTC Peg Risk**: Monitor 1:1 peg health
- **Oracle Failure**: Multi-oracle backup system
- **Smart Contract Bugs**: Extensive testing + audit
- **Stacks Network Downtime**: Status monitoring

### Market Risks
- **Low Liquidity**: Seed initial markets with protocol funds
- **Market Manipulation**: Volume limits, oracle verification
- **Adverse Selection**: Market creation fees, oracle bonds

### Regulatory Risks
- **Prediction Market Legality**: Legal review, geo-blocking if needed
- **AML/KYC**: Optional for high-volume traders
- **Securities Classification**: Markets on events only, no financial derivatives initially

---

## Conclusion

This architecture provides a comprehensive blueprint for building WagerWars as a production-ready prediction market on Stacks. The system leverages:

✅ **Bitcoin Security**: 100% finality via Stacks L2
✅ **sBTC Integration**: Real Bitcoin for wagers
✅ **Clarity Smart Contracts**: Secure, auditable, decidable
✅ **Modern Frontend**: Next.js + React for great UX
✅ **Scalable Backend**: Indexer + caching for performance
✅ **Decentralized Oracles**: Trustless resolution (Phase 2)

**Next Steps**:
1. Review and approve this architecture
2. Set up development environment (Clarinet, Stacks.js)
3. Begin Phase 1: Core smart contracts
4. Iterate based on testing and feedback

**Estimated Timeline**: 10 weeks to mainnet launch (aggressive but achievable)

---

## Resources

**Stacks & Clarity**
- [Stacks Documentation](https://docs.stacks.co/)
- [Clarity Language Book](https://book.clarity-lang.org/)
- [Clarity Camp Course](https://learn.stacks.org/course/clarity-camp)
- [SIP-010 Fungible Token Standard](https://github.com/stacksgov/sips/blob/main/sips/sip-010/sip-010-fungible-token-standard.md)

**sBTC**
- [sBTC Overview](https://www.stacks.co/sbtc)
- [sBTC Developer Docs](https://docs.stacks.co/concepts/sbtc/operations/deposit-withdrawal-times)

**Prediction Markets**
- [Polymarket](https://polymarket.com/) - Reference implementation
- [Augur Whitepaper](https://augur.net/) - Market scoring rules
- [LMSR Explainer](https://www.cultivatelabs.com/prediction-markets-guide/how-do-prediction-markets-work/automated-market-makers)

**Development Tools**
- [Clarinet SDK](https://github.com/hirosystems/clarinet)
- [Stacks.js](https://github.com/hirosystems/stacks.js)
- [Hiro Platform](https://www.hiro.so/)

---

*Document Version: 1.0*
*Last Updated: 2025-11-23*
*Author: WagerWars Team*
