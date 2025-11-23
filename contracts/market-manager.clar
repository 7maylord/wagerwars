;; Market Manager Contract
;; Handles creation, resolution, and lifecycle management of prediction markets
;; Supports three market types: Binary, Categorical, and Scalar

;; ============================================
;; Constants
;; ============================================

;; Contract owner
(define-constant CONTRACT-OWNER tx-sender)

;; Market types
(define-constant MARKET-TYPE-BINARY "binary")
(define-constant MARKET-TYPE-CATEGORICAL "categorical")
(define-constant MARKET-TYPE-SCALAR "scalar")

;; Market statuses
(define-constant STATUS-OPEN "open")
(define-constant STATUS-LOCKED "locked")
(define-constant STATUS-RESOLVED "resolved")
(define-constant STATUS-CANCELLED "cancelled")

;; Fees and limits
(define-constant MARKET-CREATION-FEE u10000000) ;; 10 STX in micro-STX
(define-constant PROTOCOL-FEE-BPS u200) ;; 2% in basis points (200/10000)
(define-constant MIN-LIQUIDITY u1000000) ;; Minimum 1 sBTC liquidity
(define-constant MAX-OUTCOMES u10) ;; Maximum outcomes for categorical markets
(define-constant MIN-RESOLUTION-TIME u3600) ;; Minimum 1 hour from creation

;; Scalar market constants
(define-constant SCALAR-BUCKETS u100) ;; Number of price buckets for scalar markets

;; Error codes
(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant ERR-MARKET-NOT-FOUND (err u101))
(define-constant ERR-MARKET-NOT-OPEN (err u102))
(define-constant ERR-MARKET-ALREADY-RESOLVED (err u103))
(define-constant ERR-INVALID-OUTCOME (err u104))
(define-constant ERR-INVALID-MARKET-TYPE (err u105))
(define-constant ERR-RESOLUTION-TIME-NOT-REACHED (err u106))
(define-constant ERR-INVALID-PARAMETERS (err u107))
(define-constant ERR-INSUFFICIENT-FEE (err u108))
(define-constant ERR-MARKET-LOCKED (err u109))
(define-constant ERR-INVALID-ORACLE (err u110))
(define-constant ERR-TOO-MANY-OUTCOMES (err u111))
(define-constant ERR-INVALID-SCALAR-RANGE (err u112))

;; ============================================
;; Data Variables
;; ============================================

(define-data-var next-market-id uint u1)
(define-data-var contract-paused bool false)
(define-data-var total-markets-created uint u0)
(define-data-var total-volume uint u0)

;; ============================================
;; Data Maps
;; ============================================

;; Main market data
(define-map markets
  { market-id: uint }
  {
    creator: principal,
    market-type: (string-ascii 20),
    question: (string-ascii 256),
    description: (optional (string-utf8 500)),
    outcome-count: uint,
    resolution-time: uint,
    lock-time: uint,
    oracle: principal,
    liquidity-param: uint, ;; 'b' parameter for LMSR
    total-volume: uint,
    resolved-outcome: (optional uint),
    status: (string-ascii 20),
    metadata-uri: (optional (string-ascii 256)),
    created-at: uint,
    resolved-at: (optional uint)
  }
)

;; Market outcomes (for Binary and Categorical)
(define-map market-outcomes
  { market-id: uint, outcome-id: uint }
  {
    name: (string-ascii 64),
    total-shares: uint, ;; q_i in LMSR formula
    current-price: uint ;; Cached price in fixed-point
  }
)

;; Scalar market configuration
(define-map scalar-markets
  { market-id: uint }
  {
    min-value: uint,
    max-value: uint,
    unit: (string-ascii 20), ;; e.g., "USD", "points"
    resolved-value: (optional uint)
  }
)

;; Market categories for filtering
(define-map market-categories
  { market-id: uint }
  { category: (string-ascii 20) } ;; "sports", "politics", "crypto", "custom"
)

;; Oracle whitelist
(define-map authorized-oracles
  { oracle: principal }
  {
    active: bool,
    markets-resolved: uint,
    bond-amount: uint
  }
)

;; Market resolution disputes
(define-map resolution-disputes
  { market-id: uint }
  {
    disputer: principal,
    disputed-at: uint,
    resolved: bool
  }
)

;; ============================================
;; Read-Only Functions
;; ============================================

;; Get market details
(define-read-only (get-market (market-id uint))
  (map-get? markets { market-id: market-id })
)

;; Get outcome details
(define-read-only (get-outcome (market-id uint) (outcome-id uint))
  (map-get? market-outcomes { market-id: market-id, outcome-id: outcome-id })
)

;; Get scalar market details
(define-read-only (get-scalar-market (market-id uint))
  (map-get? scalar-markets { market-id: market-id })
)

;; Get market category
(define-read-only (get-market-category (market-id uint))
  (map-get? market-categories { market-id: market-id })
)

;; Check if oracle is authorized
(define-read-only (is-authorized-oracle (oracle principal))
  (match (map-get? authorized-oracles { oracle: oracle })
    oracle-data (get active oracle-data)
    false
  )
)

;; Check if market can be traded
(define-read-only (can-trade (market-id uint))
  (match (map-get? markets { market-id: market-id })
    market
      (and
        (is-eq (get status market) STATUS-OPEN)
        (< block-height (get lock-time market))
        (not (var-get contract-paused))
      )
    false
  )
)

;; Check if market can be resolved
(define-read-only (can-resolve (market-id uint))
  (match (map-get? markets { market-id: market-id })
    market
      (and
        (or (is-eq (get status market) STATUS-OPEN)
            (is-eq (get status market) STATUS-LOCKED))
        (>= block-height (get resolution-time market))
        (is-none (get resolved-outcome market))
      )
    false
  )
)

;; Get contract statistics
(define-read-only (get-contract-stats)
  {
    total-markets: (var-get total-markets-created),
    total-volume: (var-get total-volume),
    next-market-id: (var-get next-market-id),
    paused: (var-get contract-paused)
  }
)

;; ============================================
;; Public Functions - Market Creation
;; ============================================

;; Create a binary market (Yes/No)
(define-public (create-binary-market
  (question (string-ascii 256))
  (description (optional (string-utf8 500)))
  (resolution-time uint)
  (lock-time uint)
  (oracle principal)
  (liquidity-param uint)
  (category (string-ascii 20))
  (metadata-uri (optional (string-ascii 256))))
  (let (
    (market-id (var-get next-market-id))
    (creation-time block-height)
  )
    ;; Validations
    (asserts! (not (var-get contract-paused)) ERR-UNAUTHORIZED)
    (asserts! (>= resolution-time (+ creation-time MIN-RESOLUTION-TIME)) ERR-INVALID-PARAMETERS)
    (asserts! (< lock-time resolution-time) ERR-INVALID-PARAMETERS)
    (asserts! (> liquidity-param u0) ERR-INVALID-PARAMETERS)
    (asserts! (is-authorized-oracle oracle) ERR-INVALID-ORACLE)

    ;; Pay creation fee (would integrate with STX token)
    ;; (try! (stx-transfer? MARKET-CREATION-FEE tx-sender CONTRACT-OWNER))

    ;; Create market
    (map-set markets
      { market-id: market-id }
      {
        creator: tx-sender,
        market-type: MARKET-TYPE-BINARY,
        question: question,
        description: description,
        outcome-count: u2,
        resolution-time: resolution-time,
        lock-time: lock-time,
        oracle: oracle,
        liquidity-param: liquidity-param,
        total-volume: u0,
        resolved-outcome: none,
        status: STATUS-OPEN,
        metadata-uri: metadata-uri,
        created-at: creation-time,
        resolved-at: none
      }
    )

    ;; Create outcomes: Yes (0) and No (1)
    (map-set market-outcomes
      { market-id: market-id, outcome-id: u0 }
      { name: "Yes", total-shares: u0, current-price: u500000 } ;; Start at 50%
    )
    (map-set market-outcomes
      { market-id: market-id, outcome-id: u1 }
      { name: "No", total-shares: u0, current-price: u500000 } ;; Start at 50%
    )

    ;; Set category
    (map-set market-categories { market-id: market-id } { category: category })

    ;; Update state
    (var-set next-market-id (+ market-id u1))
    (var-set total-markets-created (+ (var-get total-markets-created) u1))

    ;; Emit event
    (print {
      event: "market-created",
      market-id: market-id,
      market-type: MARKET-TYPE-BINARY,
      creator: tx-sender,
      question: question,
      resolution-time: resolution-time
    })

    (ok market-id)
  )
)

;; Create a categorical market (Multiple outcomes)
(define-public (create-categorical-market
  (question (string-ascii 256))
  (description (optional (string-utf8 500)))
  (outcomes (list 10 (string-ascii 64)))
  (resolution-time uint)
  (lock-time uint)
  (oracle principal)
  (liquidity-param uint)
  (category (string-ascii 20))
  (metadata-uri (optional (string-ascii 256))))
  (let (
    (market-id (var-get next-market-id))
    (creation-time block-height)
    (outcome-count (len outcomes))
  )
    ;; Validations
    (asserts! (not (var-get contract-paused)) ERR-UNAUTHORIZED)
    (asserts! (>= resolution-time (+ creation-time MIN-RESOLUTION-TIME)) ERR-INVALID-PARAMETERS)
    (asserts! (< lock-time resolution-time) ERR-INVALID-PARAMETERS)
    (asserts! (> liquidity-param u0) ERR-INVALID-PARAMETERS)
    (asserts! (is-authorized-oracle oracle) ERR-INVALID-ORACLE)
    (asserts! (and (>= outcome-count u2) (<= outcome-count MAX-OUTCOMES)) ERR-TOO-MANY-OUTCOMES)

    ;; Create market
    (map-set markets
      { market-id: market-id }
      {
        creator: tx-sender,
        market-type: MARKET-TYPE-CATEGORICAL,
        question: question,
        description: description,
        outcome-count: outcome-count,
        resolution-time: resolution-time,
        lock-time: lock-time,
        oracle: oracle,
        liquidity-param: liquidity-param,
        total-volume: u0,
        resolved-outcome: none,
        status: STATUS-OPEN,
        metadata-uri: metadata-uri,
        created-at: creation-time,
        resolved-at: none
      }
    )

    ;; Create outcome entries
    (try! (create-outcomes market-id outcomes))

    ;; Set category
    (map-set market-categories { market-id: market-id } { category: category })

    ;; Update state
    (var-set next-market-id (+ market-id u1))
    (var-set total-markets-created (+ (var-get total-markets-created) u1))

    ;; Emit event
    (print {
      event: "market-created",
      market-id: market-id,
      market-type: MARKET-TYPE-CATEGORICAL,
      creator: tx-sender,
      question: question,
      outcome-count: outcome-count,
      resolution-time: resolution-time
    })

    (ok market-id)
  )
)

;; Create a scalar market (Price range)
(define-public (create-scalar-market
  (question (string-ascii 256))
  (description (optional (string-utf8 500)))
  (min-value uint)
  (max-value uint)
  (unit (string-ascii 20))
  (resolution-time uint)
  (lock-time uint)
  (oracle principal)
  (liquidity-param uint)
  (category (string-ascii 20))
  (metadata-uri (optional (string-ascii 256))))
  (let (
    (market-id (var-get next-market-id))
    (creation-time block-height)
  )
    ;; Validations
    (asserts! (not (var-get contract-paused)) ERR-UNAUTHORIZED)
    (asserts! (>= resolution-time (+ creation-time MIN-RESOLUTION-TIME)) ERR-INVALID-PARAMETERS)
    (asserts! (< lock-time resolution-time) ERR-INVALID-PARAMETERS)
    (asserts! (> liquidity-param u0) ERR-INVALID-PARAMETERS)
    (asserts! (is-authorized-oracle oracle) ERR-INVALID-ORACLE)
    (asserts! (< min-value max-value) ERR-INVALID-SCALAR-RANGE)

    ;; Create market
    (map-set markets
      { market-id: market-id }
      {
        creator: tx-sender,
        market-type: MARKET-TYPE-SCALAR,
        question: question,
        description: description,
        outcome-count: SCALAR-BUCKETS, ;; 100 buckets for the range
        resolution-time: resolution-time,
        lock-time: lock-time,
        oracle: oracle,
        liquidity-param: liquidity-param,
        total-volume: u0,
        resolved-outcome: none,
        status: STATUS-OPEN,
        metadata-uri: metadata-uri,
        created-at: creation-time,
        resolved-at: none
      }
    )

    ;; Create scalar market data
    (map-set scalar-markets
      { market-id: market-id }
      {
        min-value: min-value,
        max-value: max-value,
        unit: unit,
        resolved-value: none
      }
    )

    ;; Initialize buckets (simplified - in production, could use liquidity pools)
    ;; For now, we'll handle bucket trading in the order-book contract

    ;; Set category
    (map-set market-categories { market-id: market-id } { category: category })

    ;; Update state
    (var-set next-market-id (+ market-id u1))
    (var-set total-markets-created (+ (var-get total-markets-created) u1))

    ;; Emit event
    (print {
      event: "market-created",
      market-id: market-id,
      market-type: MARKET-TYPE-SCALAR,
      creator: tx-sender,
      question: question,
      min-value: min-value,
      max-value: max-value,
      resolution-time: resolution-time
    })

    (ok market-id)
  )
)

;; ============================================
;; Public Functions - Market Resolution
;; ============================================

;; Resolve a market (called by oracle)
(define-public (resolve-market (market-id uint) (winning-outcome uint))
  (let (
    (market (unwrap! (map-get? markets { market-id: market-id }) ERR-MARKET-NOT-FOUND))
  )
    ;; Validations
    (asserts! (is-eq tx-sender (get oracle market)) ERR-UNAUTHORIZED)
    (asserts! (can-resolve market-id) ERR-RESOLUTION-TIME-NOT-REACHED)
    (asserts! (< winning-outcome (get outcome-count market)) ERR-INVALID-OUTCOME)

    ;; Update market
    (map-set markets
      { market-id: market-id }
      (merge market {
        resolved-outcome: (some winning-outcome),
        status: STATUS-RESOLVED,
        resolved-at: (some block-height)
      })
    )

    ;; Emit event
    (print {
      event: "market-resolved",
      market-id: market-id,
      winning-outcome: winning-outcome,
      oracle: tx-sender,
      resolved-at: block-height
    })

    (ok true)
  )
)

;; Resolve a scalar market with a specific value
(define-public (resolve-scalar-market (market-id uint) (resolved-value uint))
  (let (
    (market (unwrap! (map-get? markets { market-id: market-id }) ERR-MARKET-NOT-FOUND))
    (scalar-config (unwrap! (map-get? scalar-markets { market-id: market-id }) ERR-INVALID-MARKET-TYPE))
  )
    ;; Validations
    (asserts! (is-eq (get market-type market) MARKET-TYPE-SCALAR) ERR-INVALID-MARKET-TYPE)
    (asserts! (is-eq tx-sender (get oracle market)) ERR-UNAUTHORIZED)
    (asserts! (can-resolve market-id) ERR-RESOLUTION-TIME-NOT-REACHED)
    (asserts! (and (>= resolved-value (get min-value scalar-config))
                   (<= resolved-value (get max-value scalar-config)))
              ERR-INVALID-PARAMETERS)

    ;; Update scalar market
    (map-set scalar-markets
      { market-id: market-id }
      (merge scalar-config { resolved-value: (some resolved-value) })
    )

    ;; Update market status
    (map-set markets
      { market-id: market-id }
      (merge market {
        status: STATUS-RESOLVED,
        resolved-at: (some block-height)
      })
    )

    ;; Emit event
    (print {
      event: "scalar-market-resolved",
      market-id: market-id,
      resolved-value: resolved-value,
      oracle: tx-sender,
      resolved-at: block-height
    })

    (ok true)
  )
)

;; Cancel a market (only creator, before any trades)
(define-public (cancel-market (market-id uint))
  (let (
    (market (unwrap! (map-get? markets { market-id: market-id }) ERR-MARKET-NOT-FOUND))
  )
    ;; Only creator can cancel
    (asserts! (is-eq tx-sender (get creator market)) ERR-UNAUTHORIZED)
    ;; Can only cancel if no volume
    (asserts! (is-eq (get total-volume market) u0) ERR-INVALID-PARAMETERS)
    ;; Must be open
    (asserts! (is-eq (get status market) STATUS-OPEN) ERR-MARKET-NOT-OPEN)

    ;; Update status
    (map-set markets
      { market-id: market-id }
      (merge market { status: STATUS-CANCELLED })
    )

    ;; Emit event
    (print {
      event: "market-cancelled",
      market-id: market-id,
      creator: tx-sender
    })

    (ok true)
  )
)

;; ============================================
;; Public Functions - Oracle Management
;; ============================================

;; Register as an oracle (requires bond)
(define-public (register-oracle (bond-amount uint))
  (begin
    (asserts! (>= bond-amount u1000000000) ERR-INVALID-PARAMETERS) ;; Min 1000 STX

    ;; Store bond (would integrate with STX token)
    ;; (try! (stx-transfer? bond-amount tx-sender (as-contract tx-sender)))

    (map-set authorized-oracles
      { oracle: tx-sender }
      {
        active: true,
        markets-resolved: u0,
        bond-amount: bond-amount
      }
    )

    (print { event: "oracle-registered", oracle: tx-sender, bond: bond-amount })
    (ok true)
  )
)

;; Deactivate oracle
(define-public (deactivate-oracle (oracle principal))
  (let (
    (oracle-data (unwrap! (map-get? authorized-oracles { oracle: oracle }) ERR-INVALID-ORACLE))
  )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)

    (map-set authorized-oracles
      { oracle: oracle }
      (merge oracle-data { active: false })
    )

    (print { event: "oracle-deactivated", oracle: oracle })
    (ok true)
  )
)

;; ============================================
;; Admin Functions
;; ============================================

;; Pause contract (emergency)
(define-public (pause-contract)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)
    (var-set contract-paused true)
    (print { event: "contract-paused" })
    (ok true)
  )
)

;; Unpause contract
(define-public (unpause-contract)
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-UNAUTHORIZED)
    (var-set contract-paused false)
    (print { event: "contract-unpaused" })
    (ok true)
  )
)

;; ============================================
;; Private Functions
;; ============================================

;; Helper to create outcome entries for categorical markets
(define-private (create-outcomes (market-id uint) (outcome-names (list 10 (string-ascii 64))))
  (let (
    (initial-price (/ u1000000 (len outcome-names))) ;; Equal probability to start
  )
    (fold create-outcome-entry
          outcome-names
          { market-id: market-id, index: u0, success: true })
    (ok true)
  )
)

(define-private (create-outcome-entry
  (outcome-name (string-ascii 64))
  (state { market-id: uint, index: uint, success: bool }))
  (begin
    (map-set market-outcomes
      { market-id: (get market-id state), outcome-id: (get index state) }
      {
        name: outcome-name,
        total-shares: u0,
        current-price: (/ u1000000 u10) ;; Placeholder, will be calculated
      }
    )
    { market-id: (get market-id state), index: (+ (get index state) u1), success: true }
  )
)

;; Update market volume (called by order-book)
(define-public (update-market-volume (market-id uint) (volume-delta uint))
  (let (
    (market (unwrap! (map-get? markets { market-id: market-id }) ERR-MARKET-NOT-FOUND))
  )
    ;; Only order-book contract can call this
    ;; In production, check that tx-sender is the order-book contract

    (map-set markets
      { market-id: market-id }
      (merge market {
        total-volume: (+ (get total-volume market) volume-delta)
      })
    )

    ;; Update global volume
    (var-set total-volume (+ (var-get total-volume) volume-delta))

    (ok true)
  )
)
