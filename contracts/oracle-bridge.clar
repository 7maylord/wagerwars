;; Oracle Bridge Contract
;; Manages oracle registration, market resolution, and dispute mechanism
;; Implements slashing for incorrect oracle data

;; ============================================
;; Constants
;; ============================================

(define-constant CONTRACT-OWNER tx-sender)

;; Oracle requirements
(define-constant MIN-ORACLE-BOND u1000000000000) ;; 1,000,000 STX minimum bond
(define-constant DISPUTE-WINDOW u144) ;; ~24 hours in blocks (assuming 10 min blocks)
(define-constant SLASH-PERCENTAGE u5000) ;; 50% of bond slashed (5000/10000)

;; Oracle tiers (different bond amounts = different privileges)
(define-constant TIER-BRONZE u1000000000000) ;; 1M STX
(define-constant TIER-SILVER u5000000000000) ;; 5M STX
(define-constant TIER-GOLD u10000000000000) ;; 10M STX

;; Error codes
(define-constant ERR-UNAUTHORIZED (err u400))
(define-constant ERR-ORACLE-NOT-FOUND (err u401))
(define-constant ERR-INSUFFICIENT-BOND (err u402))
(define-constant ERR-ORACLE-INACTIVE (err u403))
(define-constant ERR-MARKET-NOT-FOUND (err u404))
(define-constant ERR-ALREADY-RESOLVED (err u405))
(define-constant ERR-DISPUTE-WINDOW-CLOSED (err u406))
(define-constant ERR-INVALID-RESOLUTION (err u407))
(define-constant ERR-ALREADY-DISPUTED (err u408))
(define-constant ERR-ORACLE-ALREADY-REGISTERED (err u409))
(define-constant ERR-INVALID-DISPUTE (err u410))

;; ============================================
;; Data Variables
;; ============================================

(define-data-var total-oracles-registered uint u0)
(define-data-var total-resolutions uint u0)
(define-data-var total-disputes uint u0)
(define-data-var total-slashed-amount uint u0)

;; ============================================
;; Data Maps
;; ============================================

;; Oracle registry
(define-map oracles
  { oracle: principal }
  {
    bond-amount: uint,
    tier: (string-ascii 10),
    active: bool,
    markets-resolved: uint,
    successful-resolutions: uint,
    disputed-resolutions: uint,
    total-slashed: uint,
    registered-at: uint,
    reputation-score: uint ;; 0-10000, starts at 10000 (100%)
  }
)

;; Market oracle assignments
(define-map market-oracle-data
  { market-id: uint }
  {
    oracle: principal,
    resolution-deadline: uint,
    resolved: bool,
    resolution-submitted-at: (optional uint),
    dispute-deadline: uint,
    disputed: bool
  }
)

;; Resolution data
(define-map market-resolutions
  { market-id: uint }
  {
    oracle: principal,
    outcome-id: uint,
    resolved-at: uint,
    finalized: bool
  }
)

;; Disputes
(define-map resolution-disputes
  { market-id: uint }
  {
    disputer: principal,
    disputed-at: uint,
    dispute-reason: (string-utf8 256),
    resolved: bool,
    dispute-valid: bool,
    resolved-by: (optional principal)
  }
)

;; Oracle bond withdrawals (timelock)
(define-map pending-withdrawals
  { oracle: principal }
  {
    amount: uint,
    requested-at: uint,
    withdrawal-available-at: uint
  }
)

;; ============================================
;; Read-Only Functions
;; ============================================

;; Get oracle info
(define-read-only (get-oracle (oracle principal))
  (map-get? oracles { oracle: oracle })
)

;; Get market oracle assignment
(define-read-only (get-market-oracle (market-id uint))
  (map-get? market-oracle-data { market-id: market-id })
)

;; Get market resolution
(define-read-only (get-market-resolution (market-id uint))
  (map-get? market-resolutions { market-id: market-id })
)

;; Get dispute info
(define-read-only (get-dispute (market-id uint))
  (map-get? resolution-disputes { market-id: market-id })
)

;; Check if oracle is authorized and active
(define-read-only (is-oracle-authorized (oracle principal))
  (match (map-get? oracles { oracle: oracle })
    oracle-data (and (get active oracle-data) (> (get reputation-score oracle-data) u3000))
    false
  )
)

;; Get oracle tier
(define-read-only (get-oracle-tier (oracle principal))
  (match (map-get? oracles { oracle: oracle })
    oracle-data (ok (get tier oracle-data))
    ERR-ORACLE-NOT-FOUND
  )
)

;; Get oracle statistics
(define-read-only (get-oracle-stats)
  (ok {
    total-oracles: (var-get total-oracles-registered),
    total-resolutions: (var-get total-resolutions),
    total-disputes: (var-get total-disputes),
    total-slashed: (var-get total-slashed-amount)
  })
)

;; ============================================
;; Public Functions - Oracle Management
;; ============================================

;; Register as an oracle with bond
(define-public (register-oracle (bond-amount uint))
  (begin
    ;; Check not already registered
    (asserts! (is-none (map-get? oracles { oracle: tx-sender })) ERR-ORACLE-ALREADY-REGISTERED)

    ;; Check minimum bond
    (asserts! (>= bond-amount MIN-ORACLE-BOND) ERR-INSUFFICIENT-BOND)

    ;; Transfer bond to contract (would use STX token)
    ;; (try! (stx-transfer? bond-amount tx-sender (as-contract tx-sender)))

    ;; Determine tier based on bond amount
    (let (
      (tier (if (>= bond-amount TIER-GOLD)
               "gold"
               (if (>= bond-amount TIER-SILVER)
                  "silver"
                  "bronze")))
    )
      ;; Register oracle
      (map-set oracles
        { oracle: tx-sender }
        {
          bond-amount: bond-amount,
          tier: tier,
          active: true,
          markets-resolved: u0,
          successful-resolutions: u0,
          disputed-resolutions: u0,
          total-slashed: u0,
          registered-at: block-height,
          reputation-score: u10000 ;; Start at 100%
        }
      )

      ;; Update counter
      (var-set total-oracles-registered (+ (var-get total-oracles-registered) u1))

      (print {
        event: "oracle-registered",
        oracle: tx-sender,
        bond-amount: bond-amount,
        tier: tier
      })

      (ok true)
    )
  )
)

;; Increase oracle bond (improve tier)
(define-public (increase-bond (additional-amount uint))
  (let (
    (oracle-data (unwrap! (map-get? oracles { oracle: tx-sender }) ERR-ORACLE-NOT-FOUND))
    (new-bond (+ (get bond-amount oracle-data) additional-amount))
  )
    ;; Transfer additional bond
    ;; (try! (stx-transfer? additional-amount tx-sender (as-contract tx-sender)))

    ;; Update tier
    (let (
      (new-tier (if (>= new-bond TIER-GOLD)
                   "gold"
                   (if (>= new-bond TIER-SILVER)
                      "silver"
                      "bronze")))
    )
      (map-set oracles
        { oracle: tx-sender }
        (merge oracle-data {
          bond-amount: new-bond,
          tier: new-tier
        })
      )

      (print {
        event: "bond-increased",
        oracle: tx-sender,
        new-bond: new-bond,
        new-tier: new-tier
      })

      (ok true)
    )
  )
)

;; Request bond withdrawal (with timelock)
(define-public (request-withdrawal (amount uint))
  (let (
    (oracle-data (unwrap! (map-get? oracles { oracle: tx-sender }) ERR-ORACLE-NOT-FOUND))
    (withdrawal-delay u1440) ;; ~10 days
  )
    (asserts! (<= amount (get bond-amount oracle-data)) ERR-INSUFFICIENT-BOND)

    ;; Set pending withdrawal
    (map-set pending-withdrawals
      { oracle: tx-sender }
      {
        amount: amount,
        requested-at: block-height,
        withdrawal-available-at: (+ block-height withdrawal-delay)
      }
    )

    (print {
      event: "withdrawal-requested",
      oracle: tx-sender,
      amount: amount,
      available-at: (+ block-height withdrawal-delay)
    })

    (ok true)
  )
)

;; Execute withdrawal after timelock
(define-public (execute-withdrawal)
  (let (
    (withdrawal (unwrap! (map-get? pending-withdrawals { oracle: tx-sender }) ERR-ORACLE-NOT-FOUND))
    (oracle-data (unwrap! (map-get? oracles { oracle: tx-sender }) ERR-ORACLE-NOT-FOUND))
  )
    ;; Check timelock
    (asserts! (>= block-height (get withdrawal-available-at withdrawal)) ERR-UNAUTHORIZED)

    ;; Transfer bond back
    ;; (try! (as-contract (stx-transfer? (get amount withdrawal) tx-sender tx-sender)))

    ;; Update oracle bond
    (map-set oracles
      { oracle: tx-sender }
      (merge oracle-data {
        bond-amount: (- (get bond-amount oracle-data) (get amount withdrawal))
      })
    )

    ;; Remove pending withdrawal
    (map-delete pending-withdrawals { oracle: tx-sender })

    (print {
      event: "withdrawal-executed",
      oracle: tx-sender,
      amount: (get amount withdrawal)
    })

    (ok (get amount withdrawal))
  )
)

;; ============================================
;; Public Functions - Resolution
;; ============================================

;; Assign oracle to market (called by market-manager)
(define-public (assign-oracle-to-market (market-id uint) (oracle principal) (resolution-deadline uint))
  (begin
    ;; Only market-manager can call this
    ;; In production: (asserts! (is-eq tx-sender .market-manager) ERR-UNAUTHORIZED)

    ;; Check oracle is authorized
    (asserts! (is-oracle-authorized oracle) ERR-ORACLE-INACTIVE)

    ;; Assign oracle
    (map-set market-oracle-data
      { market-id: market-id }
      {
        oracle: oracle,
        resolution-deadline: resolution-deadline,
        resolved: false,
        resolution-submitted-at: none,
        dispute-deadline: (+ resolution-deadline DISPUTE-WINDOW),
        disputed: false
      }
    )

    (ok true)
  )
)

;; Submit market resolution
(define-public (submit-resolution (market-id uint) (outcome-id uint))
  (let (
    (oracle-assignment (unwrap! (map-get? market-oracle-data { market-id: market-id }) ERR-MARKET-NOT-FOUND))
    (oracle-data (unwrap! (map-get? oracles { oracle: tx-sender }) ERR-ORACLE-NOT-FOUND))
  )
    ;; Validations
    (asserts! (is-eq tx-sender (get oracle oracle-assignment)) ERR-UNAUTHORIZED)
    (asserts! (not (get resolved oracle-assignment)) ERR-ALREADY-RESOLVED)
    (asserts! (>= block-height (get resolution-deadline oracle-assignment)) ERR-UNAUTHORIZED)

    ;; Submit resolution to market-manager
    (try! (contract-call? .market-manager resolve-market market-id outcome-id))

    ;; Update oracle assignment
    (map-set market-oracle-data
      { market-id: market-id }
      (merge oracle-assignment {
        resolved: true,
        resolution-submitted-at: (some block-height)
      })
    )

    ;; Record resolution
    (map-set market-resolutions
      { market-id: market-id }
      {
        oracle: tx-sender,
        outcome-id: outcome-id,
        resolved-at: block-height,
        finalized: false
      }
    )

    ;; Update oracle stats
    (map-set oracles
      { oracle: tx-sender }
      (merge oracle-data {
        markets-resolved: (+ (get markets-resolved oracle-data) u1)
      })
    )

    ;; Update global counter
    (var-set total-resolutions (+ (var-get total-resolutions) u1))

    (print {
      event: "resolution-submitted",
      market-id: market-id,
      oracle: tx-sender,
      outcome-id: outcome-id
    })

    (ok true)
  )
)

;; ============================================
;; Public Functions - Disputes
;; ============================================

;; Dispute a resolution
(define-public (dispute-resolution (market-id uint) (reason (string-utf8 256)))
  (let (
    (oracle-assignment (unwrap! (map-get? market-oracle-data { market-id: market-id }) ERR-MARKET-NOT-FOUND))
    (resolution (unwrap! (map-get? market-resolutions { market-id: market-id }) ERR-MARKET-NOT-FOUND))
  )
    ;; Validations
    (asserts! (get resolved oracle-assignment) ERR-INVALID-DISPUTE)
    (asserts! (not (get disputed oracle-assignment)) ERR-ALREADY-DISPUTED)
    (asserts! (< block-height (get dispute-deadline oracle-assignment)) ERR-DISPUTE-WINDOW-CLOSED)

    ;; Create dispute
    (map-set resolution-disputes
      { market-id: market-id }
      {
        disputer: tx-sender,
        disputed-at: block-height,
        dispute-reason: reason,
        resolved: false,
        dispute-valid: false,
        resolved-by: none
      }
    )

    ;; Update oracle assignment
    (map-set market-oracle-data
      { market-id: market-id }
      (merge oracle-assignment { disputed: true })
    )

    ;; Update global counter
    (var-set total-disputes (+ (var-get total-disputes) u1))

    (print {
      event: "resolution-disputed",
      market-id: market-id,
      disputer: tx-sender,
      oracle: (get oracle resolution)
    })

    (ok true)
  )
)

;; Resolve dispute (called by governance/admin)
(define-public (resolve-dispute (market-id uint) (dispute-valid bool))
  (let (
    (dispute (unwrap! (map-get? resolution-disputes { market-id: market-id }) ERR-MARKET-NOT-FOUND))
    (resolution (unwrap! (map-get? market-resolutions { market-id: market-id }) ERR-MARKET-NOT-FOUND))
    (oracle-data (unwrap! (map-get? oracles { oracle: (get oracle resolution) }) ERR-ORACLE-NOT-FOUND))
  )
    ;; Only admin can resolve disputes
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)
    (asserts! (not (get resolved dispute)) ERR-ALREADY-RESOLVED)

    ;; Update dispute
    (map-set resolution-disputes
      { market-id: market-id }
      (merge dispute {
        resolved: true,
        dispute-valid: dispute-valid,
        resolved-by: (some tx-sender)
      })
    )

    ;; If dispute is valid, slash oracle
    (if dispute-valid
      (begin
        (try! (slash-oracle (get oracle resolution)))
        ;; Update oracle stats
        (map-set oracles
          { oracle: (get oracle resolution) }
          (merge oracle-data {
            disputed-resolutions: (+ (get disputed-resolutions oracle-data) u1),
            reputation-score: (if (> (get reputation-score oracle-data) u1000)
                                 (- (get reputation-score oracle-data) u1000)
                                 u0)
          })
        )
        (ok true)
      )
      ;; If dispute invalid, reward oracle
      (begin
        (map-set oracles
          { oracle: (get oracle resolution) }
          (merge oracle-data {
            successful-resolutions: (+ (get successful-resolutions oracle-data) u1),
            reputation-score: (if (< (get reputation-score oracle-data) u10000)
                                 (+ (get reputation-score oracle-data) u100)
                                 u10000)
          })
        )
        (ok true)
      )
    )
  )
)

;; ============================================
;; Private Functions
;; ============================================

;; Slash oracle bond
(define-private (slash-oracle (oracle principal))
  (let (
    (oracle-data (unwrap! (map-get? oracles { oracle: oracle }) ERR-ORACLE-NOT-FOUND))
    (slash-amount (/ (* (get bond-amount oracle-data) SLASH-PERCENTAGE) u10000))
  )
    ;; Reduce oracle bond
    (map-set oracles
      { oracle: oracle }
      (merge oracle-data {
        bond-amount: (- (get bond-amount oracle-data) slash-amount),
        total-slashed: (+ (get total-slashed oracle-data) slash-amount)
      })
    )

    ;; Update global slashed amount
    (var-set total-slashed-amount (+ (var-get total-slashed-amount) slash-amount))

    (print {
      event: "oracle-slashed",
      oracle: oracle,
      amount: slash-amount
    })

    (ok slash-amount)
  )
)

;; Deactivate oracle (if bond too low or reputation too low)
(define-public (deactivate-oracle (oracle principal))
  (let (
    (oracle-data (unwrap! (map-get? oracles { oracle: oracle }) ERR-ORACLE-NOT-FOUND))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)

    (map-set oracles
      { oracle: oracle }
      (merge oracle-data { active: false })
    )

    (print { event: "oracle-deactivated", oracle: oracle })
    (ok true)
  )
)

;; Reactivate oracle
(define-public (reactivate-oracle (oracle principal))
  (let (
    (oracle-data (unwrap! (map-get? oracles { oracle: oracle }) ERR-ORACLE-NOT-FOUND))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)
    (asserts! (>= (get bond-amount oracle-data) MIN-ORACLE-BOND) ERR-INSUFFICIENT-BOND)

    (map-set oracles
      { oracle: oracle }
      (merge oracle-data { active: true })
    )

    (print { event: "oracle-reactivated", oracle: oracle })
    (ok true)
  )
)
