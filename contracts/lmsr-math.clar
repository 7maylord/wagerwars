;; LMSR Math Library
;; Implements Logarithmic Market Scoring Rule calculations using fixed-point arithmetic
;;
;; LMSR Formula: C(q) = b * ln(sum(e^(q_i/b)))
;; Price: p_i = e^(q_i/b) / sum(e^(q_j/b))
;;
;; We use fixed-point arithmetic with 6 decimal places (1e6 = 1.0)

;; Constants
(define-constant PRECISION u1000000) ;; 6 decimal places (1.0 = 1000000)
(define-constant MAX-ITERATIONS u20) ;; For Taylor series approximations
(define-constant E-CONSTANT u2718281) ;; e ≈ 2.718281 in fixed-point

;; Error codes
(define-constant ERR-OVERFLOW (err u1000))
(define-constant ERR-DIVISION-BY-ZERO (err u1001))
(define-constant ERR-NEGATIVE-VALUE (err u1002))
(define-constant ERR-INVALID-INPUT (err u1003))

;; ============================================
;; Fixed-Point Arithmetic Helpers
;; ============================================

;; Multiply two fixed-point numbers
(define-read-only (fp-multiply (a uint) (b uint))
  (/ (* a b) PRECISION)
)

;; Divide two fixed-point numbers
(define-read-only (fp-divide (a uint) (b uint))
  (if (is-eq b u0)
    u0
    (/ (* a PRECISION) b)
  )
)

;; ============================================
;; Exponential Function: e^x
;; ============================================

;; Calculate e^x using Taylor series: e^x = 1 + x + x²/2! + x³/3! + ...
;; Input: x in fixed-point
;; Output: e^x in fixed-point
(define-read-only (exp (x uint))
  (let (
    (result (fold exp-iteration
      (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15)
      {sum: PRECISION, term: PRECISION, x: x}))
  )
    (get sum result)
  )
)

;; Helper for exponential Taylor series iteration
(define-private (exp-iteration (n uint) (state {sum: uint, term: uint, x: uint}))
  (let (
    (new-term (/ (* (get term state) (get x state)) (* n PRECISION)))
  )
    {
      sum: (+ (get sum state) new-term),
      term: new-term,
      x: (get x state)
    }
  )
)

;; ============================================
;; Natural Logarithm: ln(x)
;; ============================================

;; Calculate ln(x) using Taylor series around 1: ln(1+y) = y - y²/2 + y³/3 - y⁴/4 + ...
;; Input: x in fixed-point (must be > 0)
;; Output: ln(x) in fixed-point
(define-read-only (ln (x uint))
  (if (<= x u0)
    u0 ;; ln(0) is undefined, return 0
    (if (< x PRECISION)
      ;; For x < 1, use ln(x) = -ln(1/x)
      (let ((reciprocal (fp-divide PRECISION x)))
        ;; This would be negative, but we can't represent negatives easily
        ;; Return 0 for now - this is a simplification
        u0
      )
      ;; For x >= 1, use Taylor series
      (let (
        (y (- x PRECISION)) ;; y = x - 1
        (result (fold ln-iteration
          (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10 u11 u12 u13 u14 u15)
          {sum: u0, y: y, power: y, sign: true}))
      )
        (get sum result)
      )
    )
  )
)

;; Helper for ln Taylor series iteration
(define-private (ln-iteration (n uint) (state {sum: uint, y: uint, power: uint, sign: bool}))
  (let (
    (term (/ (get power state) n))
    (new-sum (if (get sign state)
                (+ (get sum state) term)
                (if (> (get sum state) term)
                  (- (get sum state) term)
                  u0)))
    (new-power (fp-multiply (get power state) (get y state)))
  )
    {
      sum: new-sum,
      y: (get y state),
      power: new-power,
      sign: (not (get sign state))
    }
  )
)

;; ============================================
;; LMSR Pricing Functions
;; ============================================

;; Calculate LMSR cost: C(q) = b * ln(sum(e^(q_i/b)))
;; Inputs:
;;   - quantities: list of quantities for each outcome
;;   - liquidity-param: b parameter (higher = more liquidity, lower price impact)
;; Output: total cost in fixed-point
(define-read-only (lmsr-cost (quantities (list 10 uint)) (liquidity-param uint))
  (let (
    ;; Calculate e^(q_i/b) for each outcome
    (exp-terms (map (lambda (q)
                      (exp (fp-divide q liquidity-param)))
                    quantities))
    ;; Sum all exponential terms
    (sum-exp (fold + exp-terms u0))
    ;; Calculate ln(sum)
    (ln-sum (ln sum-exp))
  )
    ;; Return b * ln(sum)
    (fp-multiply liquidity-param ln-sum)
  )
)

;; Calculate price for a specific outcome: p_i = e^(q_i/b) / sum(e^(q_j/b))
;; Inputs:
;;   - quantities: list of quantities for all outcomes
;;   - outcome-index: which outcome to price (0-indexed)
;;   - liquidity-param: b parameter
;; Output: price between 0 and 1 in fixed-point
(define-read-only (lmsr-price (quantities (list 10 uint)) (outcome-index uint) (liquidity-param uint))
  (let (
    ;; Calculate e^(q_i/b) for each outcome
    (exp-terms (map (lambda (q)
                      (exp (fp-divide q liquidity-param)))
                    quantities))
    ;; Sum all exponential terms
    (sum-exp (fold + exp-terms u0))
    ;; Get the exponential term for the target outcome
    (target-exp (unwrap-panic (element-at? exp-terms outcome-index)))
  )
    ;; Return e^(q_i/b) / sum(e^(q_j/b))
    (fp-divide target-exp sum-exp)
  )
)

;; Calculate shares received for a given sBTC amount
;; This solves for: cost(q_new) - cost(q_old) = sbtc-amount
;; Simplified: assumes binary market for now, can extend
;; Inputs:
;;   - current-quantities: current shares outstanding
;;   - outcome-index: which outcome to buy
;;   - sbtc-amount: amount of sBTC to spend
;;   - liquidity-param: b parameter
;; Output: number of shares to mint
(define-read-only (calculate-shares-for-sbtc
  (current-quantities (list 10 uint))
  (outcome-index uint)
  (sbtc-amount uint)
  (liquidity-param uint))
  (let (
    ;; Get current cost
    (cost-before (lmsr-cost current-quantities liquidity-param))
    ;; Binary search or approximation for shares
    ;; For simplicity, use linear approximation: shares ≈ sbtc / price
    (current-price (lmsr-price current-quantities outcome-index liquidity-param))
  )
    ;; Simple approximation: shares = sbtc / price
    ;; This is not perfectly accurate but works for small trades
    (if (> current-price u0)
      (fp-divide sbtc-amount current-price)
      u0
    )
  )
)

;; Calculate sBTC received for selling shares
;; Inputs:
;;   - current-quantities: current shares outstanding
;;   - outcome-index: which outcome to sell
;;   - shares-to-sell: number of shares
;;   - liquidity-param: b parameter
;; Output: amount of sBTC to return
(define-read-only (calculate-sbtc-for-shares
  (current-quantities (list 10 uint))
  (outcome-index uint)
  (shares-to-sell uint)
  (liquidity-param uint))
  (let (
    ;; Calculate new quantities after selling
    (new-quantities (map-update current-quantities outcome-index
                                (lambda (q) (if (> q shares-to-sell)
                                                (- q shares-to-sell)
                                                u0))))
    ;; Get costs before and after
    (cost-before (lmsr-cost current-quantities liquidity-param))
    (cost-after (lmsr-cost new-quantities liquidity-param))
  )
    ;; Return difference (what user gets back)
    (if (> cost-before cost-after)
      (- cost-before cost-after)
      u0
    )
  )
)

;; ============================================
;; Helper Functions
;; ============================================

;; Update a specific element in a list
(define-private (map-update (lst (list 10 uint)) (index uint) (fn (uint) uint))
  (map (lambda (item-data)
         (let ((idx (get idx item-data))
               (val (get val item-data)))
           (if (is-eq idx index)
             (fn val)
             val)))
       (enumerate lst))
)

;; Create list of {idx, val} pairs for mapping
(define-private (enumerate (lst (list 10 uint)))
  (map make-indexed-item
       lst
       (list u0 u1 u2 u3 u4 u5 u6 u7 u8 u9))
)

(define-private (make-indexed-item (val uint) (idx uint))
  {idx: idx, val: val}
)

;; ============================================
;; Testing/Debug Functions
;; ============================================

;; Test exponential function
(define-read-only (test-exp (x uint))
  (exp x)
)

;; Test natural log function
(define-read-only (test-ln (x uint))
  (ln x)
)

;; Test LMSR cost for binary market (Yes/No)
(define-read-only (test-binary-cost (yes-shares uint) (no-shares uint) (liquidity uint))
  (lmsr-cost (list yes-shares no-shares) liquidity)
)

;; Test LMSR price for binary market
(define-read-only (test-binary-price (yes-shares uint) (no-shares uint) (liquidity uint) (outcome uint))
  (lmsr-price (list yes-shares no-shares) outcome liquidity)
)
