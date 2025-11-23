;; Order Book Contract
;; Handles trading using Logarithmic Market Scoring Rule (LMSR)
;; Supports buying and selling shares for all market types

;; ============================================
;; Dependencies
;; ============================================

(use-trait ft-trait .sip010-ft-trait.sip010-ft-trait)

;; ============================================
;; Constants
;; ============================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant PRECISION u1000000) ;; 6 decimal places

;; Fee constants
(define-constant PROTOCOL-FEE-BPS u200) ;; 2% protocol fee (200/10000)
(define-constant MAX-SLIPPAGE-BPS u500) ;; 5% max slippage protection (500/10000)

;; Error codes
(define-constant ERR-MARKET-NOT-FOUND (err u200))
(define-constant ERR-MARKET-NOT-TRADEABLE (err u201))
(define-constant ERR-INVALID-OUTCOME (err u202))
(define-constant ERR-INVALID-AMOUNT (err u203))
(define-constant ERR-INSUFFICIENT-BALANCE (err u204))
(define-constant ERR-SLIPPAGE-EXCEEDED (err u205))
(define-constant ERR-TRANSFER-FAILED (err u206))
(define-constant ERR-INVALID-MARKET-TYPE (err u207))
(define-constant ERR-PRICE-IMPACT-TOO-HIGH (err u208))

;; ============================================
;; Data Maps
;; ============================================

;; User positions
(define-map user-positions
  { user: principal, market-id: uint, outcome-id: uint }
  {
    shares: uint,
    avg-price: uint, ;; Average purchase price in fixed-point
    total-invested: uint ;; Total sBTC invested
  }
)

;; Liquidity pools per market outcome (stores q_i for LMSR)
(define-map outcome-liquidity
  { market-id: uint, outcome-id: uint }
  {
    shares-outstanding: uint, ;; q_i in LMSR formula
    total-sbtc-locked: uint
  }
)

;; Trade history (for recent trades)
(define-map recent-trades
  { trade-id: uint }
  {
    market-id: uint,
    user: principal,
    outcome-id: uint,
    trade-type: (string-ascii 4), ;; "buy" or "sell"
    shares: uint,
    sbtc-amount: uint,
    price: uint,
    timestamp: uint
  }
)

(define-data-var next-trade-id uint u1)

;; ============================================
;; Read-Only Functions
;; ============================================

;; Get user position
(define-read-only (get-user-position (user principal) (market-id uint) (outcome-id uint))
  (map-get? user-positions { user: user, market-id: market-id, outcome-id: outcome-id })
)

;; Get outcome liquidity
(define-read-only (get-outcome-liquidity (market-id uint) (outcome-id uint))
  (map-get? outcome-liquidity { market-id: market-id, outcome-id: outcome-id })
)

;; Get current price for an outcome using LMSR
;; Simplified - returns 50% for MVP
(define-read-only (get-current-price (market-id uint) (outcome-id uint))
  (ok u500000) ;; 0.5 = 50%
)

;; Calculate how many shares user would get for a given sBTC amount
;; Simplified for MVP
(define-read-only (calculate-buy-quote
  (market-id uint)
  (outcome-id uint)
  (sbtc-amount uint))
  (let (
    (protocol-fee (/ (* sbtc-amount PROTOCOL-FEE-BPS) u10000))
    (amount-after-fee (- sbtc-amount protocol-fee))
  )
    (ok {
      shares: amount-after-fee, ;; 1:1 conversion
      protocol-fee: protocol-fee,
      effective-price: (ok u500000)
    })
  )
)

;; Calculate how much sBTC user would get for selling shares
;; Simplified for MVP
(define-read-only (calculate-sell-quote
  (market-id uint)
  (outcome-id uint)
  (shares-to-sell uint))
  (let (
    (protocol-fee (/ (* shares-to-sell PROTOCOL-FEE-BPS) u10000))
  )
    (ok {
      sbtc-received: (- shares-to-sell protocol-fee),
      protocol-fee: protocol-fee,
      effective-price: (ok u500000)
    })
  )
)

;; Get all user positions for a market
;; Simplified for MVP
(define-read-only (get-user-market-positions (user principal) (market-id uint))
  (ok true)
)

;; ============================================
;; Public Functions - Trading
;; ============================================

;; Buy shares for a specific outcome
;; Simplified for MVP - cross-contract calls stubbed
(define-public (buy-shares
  (market-id uint)
  (outcome-id uint)
  (sbtc-amount uint)
  (min-shares uint)) ;; Slippage protection
  (let (
    (shares-to-mint sbtc-amount) ;; 1:1 conversion for now
  )
    ;; Basic validations
    (asserts! (> sbtc-amount u0) ERR-INVALID-AMOUNT)
    (asserts! (>= shares-to-mint min-shares) ERR-SLIPPAGE-EXCEEDED)

    ;; Update outcome liquidity
    (update-outcome-liquidity market-id outcome-id shares-to-mint true)

    ;; Update user position
    (update-user-position tx-sender market-id outcome-id shares-to-mint sbtc-amount)

    ;; Emit event
    (print {
      event: "shares-bought",
      market-id: market-id,
      user: tx-sender,
      outcome-id: outcome-id,
      shares: shares-to-mint,
      sbtc-amount: sbtc-amount
    })

    (ok shares-to-mint)
  )
)

;; Sell shares back to the pool
;; Simplified for MVP - cross-contract calls stubbed
(define-public (sell-shares
  (market-id uint)
  (outcome-id uint)
  (shares-to-sell uint)
  (min-sbtc uint)) ;; Slippage protection
  (let (
    (position (unwrap! (get-user-position tx-sender market-id outcome-id) ERR-INSUFFICIENT-BALANCE))
    (sbtc-to-return shares-to-sell) ;; 1:1 conversion for now
  )
    ;; Validations
    (asserts! (> shares-to-sell u0) ERR-INVALID-AMOUNT)
    (asserts! (>= (get shares position) shares-to-sell) ERR-INSUFFICIENT-BALANCE)
    (asserts! (>= sbtc-to-return min-sbtc) ERR-SLIPPAGE-EXCEEDED)

    ;; Update outcome liquidity
    (update-outcome-liquidity market-id outcome-id shares-to-sell false)

    ;; Update user position
    (reduce-user-position tx-sender market-id outcome-id shares-to-sell)

    ;; Emit event
    (print {
      event: "shares-sold",
      market-id: market-id,
      user: tx-sender,
      outcome-id: outcome-id,
      shares: shares-to-sell,
      sbtc-amount: sbtc-to-return
    })

    (ok sbtc-to-return)
  )
)

;; ============================================
;; Public Functions - Post-Resolution
;; ============================================

;; Claim winnings after market resolution
;; Simplified for MVP - assumes market is resolved and user won
(define-public (claim-winnings (market-id uint) (outcome-id uint))
  (let (
    (position (unwrap! (get-user-position tx-sender market-id outcome-id) ERR-INSUFFICIENT-BALANCE))
    (payout (* (get shares position) PRECISION))
  )
    ;; Clear position
    (map-delete user-positions { user: tx-sender, market-id: market-id, outcome-id: outcome-id })

    ;; Emit event
    (print {
      event: "winnings-claimed",
      market-id: market-id,
      user: tx-sender,
      outcome-id: outcome-id,
      shares: (get shares position),
      payout: payout
    })

    (ok payout)
  )
)

;; ============================================
;; Private Helper Functions
;; ============================================

;; Get quantities for all outcomes (q_i for LMSR)
(define-private (get-all-quantities (market-id uint) (outcome-count uint))
  (let (
    (outcome-0 (default-to { shares-outstanding: u0, total-sbtc-locked: u0 }
                            (get-outcome-liquidity market-id u0)))
    (outcome-1 (default-to { shares-outstanding: u0, total-sbtc-locked: u0 }
                            (get-outcome-liquidity market-id u1)))
    (outcome-2 (default-to { shares-outstanding: u0, total-sbtc-locked: u0 }
                            (get-outcome-liquidity market-id u2)))
    (outcome-3 (default-to { shares-outstanding: u0, total-sbtc-locked: u0 }
                            (get-outcome-liquidity market-id u3)))
    (outcome-4 (default-to { shares-outstanding: u0, total-sbtc-locked: u0 }
                            (get-outcome-liquidity market-id u4)))
    (outcome-5 (default-to { shares-outstanding: u0, total-sbtc-locked: u0 }
                            (get-outcome-liquidity market-id u5)))
    (outcome-6 (default-to { shares-outstanding: u0, total-sbtc-locked: u0 }
                            (get-outcome-liquidity market-id u6)))
    (outcome-7 (default-to { shares-outstanding: u0, total-sbtc-locked: u0 }
                            (get-outcome-liquidity market-id u7)))
    (outcome-8 (default-to { shares-outstanding: u0, total-sbtc-locked: u0 }
                            (get-outcome-liquidity market-id u8)))
    (outcome-9 (default-to { shares-outstanding: u0, total-sbtc-locked: u0 }
                            (get-outcome-liquidity market-id u9)))
  )
    (list
      (get shares-outstanding outcome-0)
      (get shares-outstanding outcome-1)
      (get shares-outstanding outcome-2)
      (get shares-outstanding outcome-3)
      (get shares-outstanding outcome-4)
      (get shares-outstanding outcome-5)
      (get shares-outstanding outcome-6)
      (get shares-outstanding outcome-7)
      (get shares-outstanding outcome-8)
      (get shares-outstanding outcome-9)
    )
  )
)

;; Update outcome liquidity
(define-private (update-outcome-liquidity
  (market-id uint)
  (outcome-id uint)
  (shares uint)
  (is-buy bool))
  (let (
    (current (default-to
              { shares-outstanding: u0, total-sbtc-locked: u0 }
              (get-outcome-liquidity market-id outcome-id)))
  )
    (map-set outcome-liquidity
      { market-id: market-id, outcome-id: outcome-id }
      {
        shares-outstanding: (if is-buy
                               (+ (get shares-outstanding current) shares)
                               (- (get shares-outstanding current) shares)),
        total-sbtc-locked: (get total-sbtc-locked current) ;; Updated by vault
      }
    )
    true
  )
)

;; Update user position on buy
(define-private (update-user-position
  (user principal)
  (market-id uint)
  (outcome-id uint)
  (new-shares uint)
  (sbtc-spent uint))
  (let (
    (current (default-to
              { shares: u0, avg-price: u0, total-invested: u0 }
              (get-user-position user market-id outcome-id)))
    (total-shares (+ (get shares current) new-shares))
    (total-invested (+ (get total-invested current) sbtc-spent))
  )
    (map-set user-positions
      { user: user, market-id: market-id, outcome-id: outcome-id }
      {
        shares: total-shares,
        avg-price: (if (> total-shares u0)
                      (/ (* total-invested PRECISION) total-shares)
                      u0),
        total-invested: total-invested
      }
    )
    true
  )
)

;; Reduce user position on sell
(define-private (reduce-user-position
  (user principal)
  (market-id uint)
  (outcome-id uint)
  (shares-sold uint))
  (let (
    (current (unwrap-panic (get-user-position user market-id outcome-id)))
    (remaining-shares (- (get shares current) shares-sold))
    (proportion-sold (/ (* shares-sold PRECISION) (get shares current)))
    (investment-reduction (/ (* (get total-invested current) proportion-sold) PRECISION))
  )
    (if (is-eq remaining-shares u0)
      ;; Delete position if fully sold
      (map-delete user-positions { user: user, market-id: market-id, outcome-id: outcome-id })
      ;; Update position
      (map-set user-positions
        { user: user, market-id: market-id, outcome-id: outcome-id }
        {
          shares: remaining-shares,
          avg-price: (get avg-price current), ;; Keep same avg price
          total-invested: (- (get total-invested current) investment-reduction)
        }
      )
    )
    true
  )
)

;; Record trade in history
;; Simplified for MVP
(define-private (record-trade
  (market-id uint)
  (user principal)
  (outcome-id uint)
  (trade-type (string-ascii 4))
  (shares uint)
  (sbtc-amount uint)
  (price uint))
  (let (
    (trade-id (var-get next-trade-id))
  )
    (map-set recent-trades
      { trade-id: trade-id }
      {
        market-id: market-id,
        user: user,
        outcome-id: outcome-id,
        trade-type: trade-type,
        shares: shares,
        sbtc-amount: sbtc-amount,
        price: price,
        timestamp: stacks-block-height
      }
    )
    (var-set next-trade-id (+ trade-id u1))
    true
  )
)
