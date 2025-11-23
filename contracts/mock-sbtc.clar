;; Mock sBTC Contract
;; For testing purposes only - simulates sBTC behavior on devnet
;; In production, this would be replaced with the real sBTC contract

(impl-trait .sip010-ft-trait.sip010-ft-trait)

;; Define the fungible token
(define-fungible-token sbtc u1000000000000000) ;; 1 billion sBTC max supply

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant ERR-UNAUTHORIZED (err u1))
(define-constant ERR-INSUFFICIENT-BALANCE (err u2))
(define-constant ERR-INVALID-AMOUNT (err u3))

;; Transfer function
(define-public (transfer
  (amount uint)
  (sender principal)
  (recipient principal)
  (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR-UNAUTHORIZED)
    (try! (ft-transfer? sbtc amount sender recipient))
    (match memo
      to-print (print to-print)
      0x
    )
    (ok true)
  )
)

;; Get token name
(define-read-only (get-name)
  (ok "Stacks Bitcoin (Mock)")
)

;; Get token symbol
(define-read-only (get-symbol)
  (ok "sBTC")
)

;; Get decimals
(define-read-only (get-decimals)
  (ok u6)
)

;; Get balance
(define-read-only (get-balance (account principal))
  (ok (ft-get-balance sbtc account))
)

;; Get total supply
(define-read-only (get-total-supply)
  (ok (ft-get-supply sbtc))
)

;; Get token URI
(define-read-only (get-token-uri)
  (ok (some u"https://www.sbtc.tech/"))
)

;; Mint function (for testing only)
(define-public (mint (amount uint) (recipient principal))
  (begin
    (try! (ft-mint? sbtc amount recipient))
    (ok true)
  )
)

;; Initialize test wallets with sBTC
(define-public (init-test-wallets)
  (begin
    ;; This would be called once to give test wallets some sBTC
    (ok true)
  )
)
