;; Vault Contract
;; Secure escrow for USDCx collateral and distribution of winnings
;; Holds all funds for prediction markets

;; ============================================
;; Constants
;; ============================================

(define-constant CONTRACT-OWNER tx-sender)
(define-constant PRECISION u1000000) ;; 6 decimal places

;; Error codes
(define-constant ERR-UNAUTHORIZED (err u300))
(define-constant ERR-INSUFFICIENT-BALANCE (err u301))
(define-constant ERR-TRANSFER-FAILED (err u302))
(define-constant ERR-MARKET-NOT-FOUND (err u303))
(define-constant ERR-INVALID-AMOUNT (err u304))
(define-constant ERR-MARKET-NOT-RESOLVED (err u305))
(define-constant ERR-ALREADY-CLAIMED (err u306))

;; ============================================
;; Data Variables
;; ============================================

(define-data-var total-locked uint u0)
(define-data-var total-fees-collected uint u0)
(define-data-var protocol-treasury principal CONTRACT-OWNER)

;; ============================================
;; Data Maps
;; ============================================

;; Market balances (total USDCx locked per market)
(define-map market-balances
  { market-id: uint }
  {
    total-locked: uint,
    total-volume: uint,
    fees-collected: uint,
    winnings-paid: uint
  }
)

;; User balances in specific markets (for refunds/payouts)
(define-map user-market-balances
  { user: principal, market-id: uint }
  {
    total-deposited: uint,
    total-withdrawn: uint,
    claimed: bool
  }
)

;; Claimable winnings (calculated after resolution)
(define-map claimable-winnings
  { user: principal, market-id: uint }
  {
    amount: uint,
    calculated-at: uint,
    claimed: bool
  }
)

;; Protocol fee recipients (for future DAO distribution)
(define-map fee-recipients
  { recipient: principal }
  { share: uint } ;; Basis points (out of 10000)
)

;; ============================================
;; Read-Only Functions
;; ============================================

;; Get market balance
(define-read-only (get-market-balance (market-id uint))
  (map-get? market-balances { market-id: market-id })
)

;; Get user market balance
(define-read-only (get-user-market-balance (user principal) (market-id uint))
  (map-get? user-market-balances { user: user, market-id: market-id })
)

;; Get claimable winnings for user
(define-read-only (get-claimable-winnings (user principal) (market-id uint))
  (map-get? claimable-winnings { user: user, market-id: market-id })
)

;; Get total locked USDCx across all markets
(define-read-only (get-total-locked)
  (ok (var-get total-locked))
)

;; Get total fees collected
(define-read-only (get-total-fees)
  (ok (var-get total-fees-collected))
)

;; Get vault statistics
(define-read-only (get-vault-stats)
  (ok {
    total-locked: (var-get total-locked),
    total-fees: (var-get total-fees-collected),
    treasury: (var-get protocol-treasury)
  })
)

;; ============================================
;; Public Functions - Deposits
;; ============================================

;; Deposit USDCx to market (called by order-book on buy)
(define-public (deposit-to-market (user principal) (market-id uint) (amount uint))
  (begin
    ;; Only order-book contract should call this
    ;; In production: (asserts! (is-eq tx-sender .order-book) ERR-UNAUTHORIZED)

    (asserts! (> amount u0) ERR-INVALID-AMOUNT)

    ;; Transfer USDCx from user to vault
    (try! (contract-call? .usdcx-token transfer-to-vault amount user))

    ;; Update market balance
    (let (
      (market-bal (default-to
                    { total-locked: u0, total-volume: u0, fees-collected: u0, winnings-paid: u0 }
                    (get-market-balance market-id)))
    )
      (map-set market-balances
        { market-id: market-id }
        (merge market-bal {
          total-locked: (+ (get total-locked market-bal) amount),
          total-volume: (+ (get total-volume market-bal) amount)
        })
      )
    )

    ;; Update user market balance
    (let (
      (user-bal (default-to
                  { total-deposited: u0, total-withdrawn: u0, claimed: false }
                  (get-user-market-balance user market-id)))
    )
      (map-set user-market-balances
        { user: user, market-id: market-id }
        (merge user-bal {
          total-deposited: (+ (get total-deposited user-bal) amount)
        })
      )
    )

    ;; Update global locked amount
    (var-set total-locked (+ (var-get total-locked) amount))

    (print {
      event: "usdcx-deposited",
      user: user,
      market-id: market-id,
      amount: amount
    })

    (ok amount)
  )
)

;; ============================================
;; Public Functions - Withdrawals
;; ============================================

;; Withdraw USDCx from market (called by order-book on sell)
(define-public (withdraw-from-market (user principal) (market-id uint) (amount uint))
  (begin
    ;; Only order-book contract should call this
    ;; In production: (asserts! (is-eq tx-sender .order-book) ERR-UNAUTHORIZED)

    (asserts! (> amount u0) ERR-INVALID-AMOUNT)

    (let (
      (market-bal (unwrap! (get-market-balance market-id) ERR-MARKET-NOT-FOUND))
    )
      ;; Check sufficient balance in market
      (asserts! (>= (get total-locked market-bal) amount) ERR-INSUFFICIENT-BALANCE)

      ;; Transfer USDCx from vault to user
      (try! (contract-call? .usdcx-token transfer-from-vault amount user))

      ;; Update market balance
      (map-set market-balances
        { market-id: market-id }
        (merge market-bal {
          total-locked: (- (get total-locked market-bal) amount)
        })
      )

      ;; Update user market balance
      (let (
        (user-bal (default-to
                    { total-deposited: u0, total-withdrawn: u0, claimed: false }
                    (get-user-market-balance user market-id)))
      )
        (map-set user-market-balances
          { user: user, market-id: market-id }
          (merge user-bal {
            total-withdrawn: (+ (get total-withdrawn user-bal) amount)
          })
        )
      )

      ;; Update global locked amount
      (var-set total-locked (- (var-get total-locked) amount))

      (print {
        event: "usdcx-withdrawn",
        user: user,
        market-id: market-id,
        amount: amount
      })

      (ok amount)
    )
  )
)

;; ============================================
;; Public Functions - Winnings Distribution
;; ============================================

;; Release winnings to user (called after market resolution)
(define-public (release-winnings (user principal) (market-id uint) (amount uint))
  (begin
    ;; Only order-book contract should call this
    ;; In production: (asserts! (is-eq tx-sender .order-book) ERR-UNAUTHORIZED)

    (asserts! (> amount u0) ERR-INVALID-AMOUNT)

    (let (
      (market-bal (unwrap! (get-market-balance market-id) ERR-MARKET-NOT-FOUND))
    )
      ;; Check sufficient balance
      (asserts! (>= (get total-locked market-bal) amount) ERR-INSUFFICIENT-BALANCE)

      ;; Transfer winnings
      (try! (contract-call? .usdcx-token transfer-from-vault amount user))

      ;; Update market balance
      (map-set market-balances
        { market-id: market-id }
        (merge market-bal {
          total-locked: (- (get total-locked market-bal) amount),
          winnings-paid: (+ (get winnings-paid market-bal) amount)
        })
      )

      ;; Mark as claimed
      (map-set user-market-balances
        { user: user, market-id: market-id }
        (merge (default-to
                { total-deposited: u0, total-withdrawn: u0, claimed: false }
                (get-user-market-balance user market-id))
               { claimed: true })
      )

      ;; Update global locked amount
      (var-set total-locked (- (var-get total-locked) amount))

      (print {
        event: "winnings-released",
        user: user,
        market-id: market-id,
        amount: amount
      })

      (ok amount)
    )
  )
)

;; Refund users in cancelled markets
(define-public (refund-cancelled-market (user principal) (market-id uint))
  (let (
    (market (unwrap! (contract-call? .market-manager get-market market-id) ERR-MARKET-NOT-FOUND))
    (user-bal (unwrap! (get-user-market-balance user market-id) ERR-INSUFFICIENT-BALANCE))
  )
    ;; Check market is cancelled
    (asserts! (is-eq (get status market) "cancelled") ERR-UNAUTHORIZED)

    ;; Check not already claimed
    (asserts! (not (get claimed user-bal)) ERR-ALREADY-CLAIMED)

    (let (
      (refund-amount (- (get total-deposited user-bal) (get total-withdrawn user-bal)))
    )
      (asserts! (> refund-amount u0) ERR-INVALID-AMOUNT)

      ;; Transfer refund
      (try! (contract-call? .usdcx-token transfer-from-vault refund-amount user))

      ;; Mark as claimed
      (map-set user-market-balances
        { user: user, market-id: market-id }
        (merge user-bal { claimed: true })
      )

      ;; Update market balance
      (let (
        (market-bal (unwrap! (get-market-balance market-id) ERR-MARKET-NOT-FOUND))
      )
        (map-set market-balances
          { market-id: market-id }
          (merge market-bal {
            total-locked: (- (get total-locked market-bal) refund-amount)
          })
        )
      )

      ;; Update global locked amount
      (var-set total-locked (- (var-get total-locked) refund-amount))

      (print {
        event: "market-refunded",
        user: user,
        market-id: market-id,
        amount: refund-amount
      })

      (ok refund-amount)
    )
  )
)

;; ============================================
;; Public Functions - Fee Management
;; ============================================

;; Collect protocol fees (called by order-book)
(define-public (collect-fee (market-id uint) (fee-amount uint))
  (begin
    ;; Only order-book contract should call this
    ;; In production: (asserts! (is-eq tx-sender .order-book) ERR-UNAUTHORIZED)

    (asserts! (> fee-amount u0) ERR-INVALID-AMOUNT)

    ;; Update market fees
    (let (
      (market-bal (default-to
                    { total-locked: u0, total-volume: u0, fees-collected: u0, winnings-paid: u0 }
                    (get-market-balance market-id)))
    )
      (map-set market-balances
        { market-id: market-id }
        (merge market-bal {
          fees-collected: (+ (get fees-collected market-bal) fee-amount)
        })
      )
    )

    ;; Update global fees
    (var-set total-fees-collected (+ (var-get total-fees-collected) fee-amount))

    (print {
      event: "fee-collected",
      market-id: market-id,
      amount: fee-amount
    })

    (ok fee-amount)
  )
)

;; Withdraw protocol fees to treasury
(define-public (withdraw-protocol-fees (amount uint))
  (let (
    (treasury (var-get protocol-treasury))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)
    (asserts! (<= amount (var-get total-fees-collected)) ERR-INSUFFICIENT-BALANCE)

    ;; Transfer fees to treasury
    (try! (contract-call? .usdcx-token transfer-from-vault amount treasury))

    ;; Update fees collected
    (var-set total-fees-collected (- (var-get total-fees-collected) amount))

    (print {
      event: "fees-withdrawn",
      amount: amount,
      recipient: treasury
    })

    (ok amount)
  )
)

;; ============================================
;; Admin Functions
;; ============================================

;; Update protocol treasury address
(define-public (set-treasury (new-treasury principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)
    (var-set protocol-treasury new-treasury)
    (print { event: "treasury-updated", new-treasury: new-treasury })
    (ok true)
  )
)

;; Emergency withdrawal (only owner, for critical bugs)
(define-public (emergency-withdraw (recipient principal) (amount uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)

    (try! (contract-call? .usdcx-token transfer-from-vault amount recipient))

    (print {
      event: "emergency-withdrawal",
      recipient: recipient,
      amount: amount
    })

    (ok amount)
  )
)

;; ============================================
;; Private Helper Functions
;; ============================================

;; Calculate market payout after resolution
;; (This would be called by order-book to set claimable winnings)
(define-public (set-claimable-winnings
  (user principal)
  (market-id uint)
  (amount uint))
  (begin
    ;; Only order-book can call this
    ;; In production: (asserts! (is-eq tx-sender .order-book) ERR-UNAUTHORIZED)

    (map-set claimable-winnings
      { user: user, market-id: market-id }
      {
        amount: amount,
        calculated-at: stacks-block-height,
        claimed: false
      }
    )

    (ok true)
  )
)
