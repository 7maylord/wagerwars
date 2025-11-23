;; WagerWars Main Contract
;; Entry point and coordinator for the WagerWars prediction market platform
;; Built on Stacks Bitcoin L2 with sBTC

;; ============================================
;; Title: WagerWars Prediction Market
;; Version: 1.0.0
;; Summary: Decentralized prediction market using LMSR pricing on Bitcoin L2
;; Description: A Polymarket-style prediction market that supports Binary,
;;              Categorical, and Scalar markets, secured by Bitcoin through Stacks
;; ============================================

;; ============================================
;; Constants
;; ============================================

(define-constant CONTRACT-VERSION "1.0.0")
(define-constant CONTRACT-OWNER tx-sender)

;; ============================================
;; Public Functions - Quick Actions
;; ============================================

;; Create a binary market (Yes/No) - simplified interface
(define-public (create-binary-prediction
  (question (string-ascii 256))
  (resolution-time uint)
  (lock-time uint)
  (oracle principal)
  (initial-liquidity uint))
  (let (
    (liquidity-param u10000000) ;; Default 10 sBTC liquidity parameter
  )
    ;; Call market-manager to create market
    (contract-call? .market-manager create-binary-market
      question
      none ;; description
      resolution-time
      lock-time
      oracle
      liquidity-param
      "custom" ;; category
      none ;; metadata-uri
    )
  )
)

;; Buy shares - simplified interface
(define-public (buy-outcome
  (market-id uint)
  (outcome-id uint)
  (sbtc-amount uint))
  (let (
    (min-shares u0) ;; No slippage protection for simplicity
  )
    (contract-call? .order-book buy-shares market-id outcome-id sbtc-amount min-shares)
  )
)

;; Sell shares - simplified interface
(define-public (sell-outcome
  (market-id uint)
  (outcome-id uint)
  (shares-amount uint))
  (let (
    (min-sbtc u0) ;; No slippage protection for simplicity
  )
    (contract-call? .order-book sell-shares market-id outcome-id shares-amount min-sbtc)
  )
)

;; Claim winnings after market resolution
(define-public (claim (market-id uint) (outcome-id uint))
  (contract-call? .order-book claim-winnings market-id outcome-id)
)

;; ============================================
;; Read-Only Functions - Information
;; ============================================

;; Get market information
(define-read-only (get-market-info (market-id uint))
  (contract-call? .market-manager get-market market-id)
)

;; Get current price for an outcome
(define-read-only (get-price (market-id uint) (outcome-id uint))
  (contract-call? .order-book get-current-price market-id outcome-id)
)

;; Get user position
(define-read-only (get-my-position (market-id uint) (outcome-id uint))
  (contract-call? .order-book get-user-position tx-sender market-id outcome-id)
)

;; Get platform statistics
;; Simplified for MVP - returns version only
(define-read-only (get-platform-stats)
  (ok {
    version: CONTRACT-VERSION
  })
)

;; ============================================
;; Helper Functions
;; ============================================

;; Calculate quote for buying
(define-read-only (get-buy-quote (market-id uint) (outcome-id uint) (sbtc-amount uint))
  (contract-call? .order-book calculate-buy-quote market-id outcome-id sbtc-amount)
)

;; Calculate quote for selling
(define-read-only (get-sell-quote (market-id uint) (outcome-id uint) (shares-amount uint))
  (contract-call? .order-book calculate-sell-quote market-id outcome-id shares-amount)
)
