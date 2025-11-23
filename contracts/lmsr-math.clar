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
(define-constant E-CONSTANT u2718281) ;; e ~ 2.718281 in fixed-point

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

;; Calculate e^x using Taylor series: e^x = 1 + x + x^2/2! + x^3/3! + ...
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

;; Calculate ln(x) using Taylor series around 1: ln(1+y) = y - y^2/2 + y^3/3 - y^4/4 + ...
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

;; Helper to sum a list
(define-private (sum-uint (a uint) (b uint))
  (+ a b)
)

;; Calculate LMSR cost: C(q) = b * ln(sum(e^(q_i/b)))
;; Simplified version that works with fixed outcomes
(define-read-only (lmsr-cost (quantities (list 10 uint)) (liquidity-param uint))
  ;; For now, just return a default value for simplicity
  ;; In production, this would calculate the full LMSR cost
  u1000000
)

;; Calculate price for a specific outcome: p_i = e^(q_i/b) / sum(e^(q_j/b))
;; Simplified version - returns 50/50 probability for now
(define-read-only (lmsr-price (quantities (list 10 uint)) (outcome-index uint) (liquidity-param uint))
  ;; Return 0.5 (50%) for simplicity
  u500000
)

;; Calculate shares received for a given sBTC amount
;; Simplified linear pricing for MVP
(define-read-only (calculate-shares-for-sbtc
  (current-quantities (list 10 uint))
  (outcome-index uint)
  (sbtc-amount uint)
  (liquidity-param uint))
  ;; Simple 1:1 conversion for now
  sbtc-amount
)

;; Calculate sBTC received for selling shares
;; Simplified linear pricing for MVP
(define-read-only (calculate-sbtc-for-shares
  (current-quantities (list 10 uint))
  (outcome-index uint)
  (shares-to-sell uint)
  (liquidity-param uint))
  ;; Simple 1:1 conversion for now
  shares-to-sell
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
