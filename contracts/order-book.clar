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
(define-read-only (get-current-price (market-id uint) (outcome-id uint))
  (let (
    (market (unwrap! (contract-call? .market-manager get-market market-id) (err u0)))
    (quantities (get-all-quantities market-id (get outcome-count market)))
  )
    ;; Call LMSR price calculation
    (ok (contract-call? .lmsr-math lmsr-price
                        quantities
                        outcome-id
                        (get liquidity-param market)))
  )
)

;; Calculate how many shares user would get for a given sBTC amount
(define-read-only (calculate-buy-quote
  (market-id uint)
  (outcome-id uint)
  (sbtc-amount uint))
  (let (
    (market (unwrap! (contract-call? .market-manager get-market market-id) (err u0)))
    (quantities (get-all-quantities market-id (get outcome-count market)))
    (protocol-fee (/ (* sbtc-amount PROTOCOL-FEE-BPS) u10000))
    (amount-after-fee (- sbtc-amount protocol-fee))
  )
    ;; Calculate shares using LMSR
    (ok {
      shares: (contract-call? .lmsr-math calculate-shares-for-sbtc
                              quantities
                              outcome-id
                              amount-after-fee
                              (get liquidity-param market)),
      protocol-fee: protocol-fee,
      effective-price: (get-current-price market-id outcome-id)
    })
  )
)

;; Calculate how much sBTC user would get for selling shares
(define-read-only (calculate-sell-quote
  (market-id uint)
  (outcome-id uint)
  (shares-to-sell uint))
  (let (
    (market (unwrap! (contract-call? .market-manager get-market market-id) (err u0)))
    (quantities (get-all-quantities market-id (get outcome-count market)))
    (sbtc-before-fee (contract-call? .lmsr-math calculate-sbtc-for-shares
                                     quantities
                                     outcome-id
                                     shares-to-sell
                                     (get liquidity-param market)))
    (protocol-fee (/ (* sbtc-before-fee PROTOCOL-FEE-BPS) u10000))
  )
    (ok {
      sbtc-received: (- sbtc-before-fee protocol-fee),
      protocol-fee: protocol-fee,
      effective-price: (get-current-price market-id outcome-id)
    })
  )
)

;; Get all user positions for a market
(define-read-only (get-user-market-positions (user principal) (market-id uint))
  (let (
    (market (unwrap! (contract-call? .market-manager get-market market-id) (err u0)))
    (outcome-count (get outcome-count market))
  )
    ;; In production, would iterate through outcomes
    ;; For now, return success
    (ok true)
  )
)

;; ============================================
;; Public Functions - Trading
;; ============================================

;; Buy shares for a specific outcome
(define-public (buy-shares
  (market-id uint)
  (outcome-id uint)
  (sbtc-amount uint)
  (min-shares uint)) ;; Slippage protection
  (let (
    (market (unwrap! (contract-call? .market-manager get-market market-id) ERR-MARKET-NOT-FOUND))
    (tradeable (unwrap! (contract-call? .market-manager can-trade market-id) ERR-MARKET-NOT-TRADEABLE))
    (quote (unwrap! (calculate-buy-quote market-id outcome-id sbtc-amount) ERR-INVALID-AMOUNT))
    (shares-to-mint (get shares quote))
    (protocol-fee (get protocol-fee quote))
  )
    ;; Validations
    (asserts! tradeable ERR-MARKET-NOT-TRADEABLE)
    (asserts! (< outcome-id (get outcome-count market)) ERR-INVALID-OUTCOME)
    (asserts! (> sbtc-amount u0) ERR-INVALID-AMOUNT)
    (asserts! (>= shares-to-mint min-shares) ERR-SLIPPAGE-EXCEEDED)

    ;; Transfer sBTC from user to vault
    (try! (contract-call? .vault deposit-to-market tx-sender market-id sbtc-amount))

    ;; Update outcome liquidity
    (update-outcome-liquidity market-id outcome-id shares-to-mint true)

    ;; Update user position
    (update-user-position tx-sender market-id outcome-id shares-to-mint sbtc-amount)

    ;; Update market volume
    (try! (contract-call? .market-manager update-market-volume market-id sbtc-amount))

    ;; Record trade
    (record-trade market-id tx-sender outcome-id "buy" shares-to-mint sbtc-amount
                  (unwrap-panic (get effective-price quote)))

    ;; Emit event
    (print {
      event: "shares-bought",
      market-id: market-id,
      user: tx-sender,
      outcome-id: outcome-id,
      shares: shares-to-mint,
      sbtc-amount: sbtc-amount,
      price: (unwrap-panic (get effective-price quote)),
      fee: protocol-fee
    })

    (ok shares-to-mint)
  )
)

;; Sell shares back to the pool
(define-public (sell-shares
  (market-id uint)
  (outcome-id uint)
  (shares-to-sell uint)
  (min-sbtc uint)) ;; Slippage protection
  (let (
    (market (unwrap! (contract-call? .market-manager get-market market-id) ERR-MARKET-NOT-FOUND))
    (tradeable (unwrap! (contract-call? .market-manager can-trade market-id) ERR-MARKET-NOT-TRADEABLE))
    (position (unwrap! (get-user-position tx-sender market-id outcome-id) ERR-INSUFFICIENT-BALANCE))
    (quote (unwrap! (calculate-sell-quote market-id outcome-id shares-to-sell) ERR-INVALID-AMOUNT))
    (sbtc-to-return (get sbtc-received quote))
    (protocol-fee (get protocol-fee quote))
  )
    ;; Validations
    (asserts! tradeable ERR-MARKET-NOT-TRADEABLE)
    (asserts! (< outcome-id (get outcome-count market)) ERR-INVALID-OUTCOME)
    (asserts! (> shares-to-sell u0) ERR-INVALID-AMOUNT)
    (asserts! (>= (get shares position) shares-to-sell) ERR-INSUFFICIENT-BALANCE)
    (asserts! (>= sbtc-to-return min-sbtc) ERR-SLIPPAGE-EXCEEDED)

    ;; Update outcome liquidity
    (update-outcome-liquidity market-id outcome-id shares-to-sell false)

    ;; Update user position
    (reduce-user-position tx-sender market-id outcome-id shares-to-sell)

    ;; Transfer sBTC from vault to user
    (try! (contract-call? .vault withdraw-from-market tx-sender market-id sbtc-to-return))

    ;; Record trade
    (record-trade market-id tx-sender outcome-id "sell" shares-to-sell sbtc-to-return
                  (unwrap-panic (get effective-price quote)))

    ;; Emit event
    (print {
      event: "shares-sold",
      market-id: market-id,
      user: tx-sender,
      outcome-id: outcome-id,
      shares: shares-to-sell,
      sbtc-amount: sbtc-to-return,
      price: (unwrap-panic (get effective-price quote)),
      fee: protocol-fee
    })

    (ok sbtc-to-return)
  )
)

;; ============================================
;; Public Functions - Post-Resolution
;; ============================================

;; Claim winnings after market resolution
(define-public (claim-winnings (market-id uint) (outcome-id uint))
  (let (
    (market (unwrap! (contract-call? .market-manager get-market market-id) ERR-MARKET-NOT-FOUND))
    (position (unwrap! (get-user-position tx-sender market-id outcome-id) ERR-INSUFFICIENT-BALANCE))
    (resolved-outcome (unwrap! (get resolved-outcome market) ERR-MARKET-NOT-FOUND))
  )
    ;; Check if user bet on winning outcome
    (asserts! (is-eq outcome-id resolved-outcome) (err u209)) ;; ERR-NOT-WINNING-OUTCOME

    ;; Calculate payout (1 sBTC per share for winning outcome)
    (let ((payout (* (get shares position) PRECISION)))
      ;; Transfer winnings from vault
      (try! (contract-call? .vault release-winnings tx-sender market-id payout))

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
(define-private (record-trade
  (market-id uint)
  (user principal)
  (outcome-id uint)
  (trade-type (string-ascii 4))
  (shares uint)
  (sbtc-amount uint)
  (price (response uint uint)))
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
        price: (default-to u0 (ok-or-default price)),
        timestamp: block-height
      }
    )
    (var-set next-trade-id (+ trade-id u1))
    true
  )
)

;; Helper to unwrap price response
(define-private (ok-or-default (result (response uint uint)))
  (match result
    ok-val ok-val
    err-val u0)
)
