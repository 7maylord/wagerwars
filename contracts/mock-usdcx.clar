;; Mock USDCx Contract
;; For testing purposes only - simulates USDCx behavior on devnet
;; In production, this would be replaced with the real USDCx contract via Circle xReserve

(impl-trait .sip010-ft-trait.sip010-ft-trait)

;; Define the fungible token
(define-fungible-token usdcx u1000000000000000) ;; 1 billion USDCx max supply

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
    (try! (ft-transfer? usdcx amount sender recipient))
    (match memo
      to-print (print to-print)
      0x
    )
    (ok true)
  )
)

;; Get token name
(define-read-only (get-name)
  (ok "USDCx (Mock)")
)

;; Get token symbol
(define-read-only (get-symbol)
  (ok "USDCx")
)

;; Get decimals (USDC uses 6 decimals)
(define-read-only (get-decimals)
  (ok u6)
)

;; Get balance
(define-read-only (get-balance (account principal))
  (ok (ft-get-balance usdcx account))
)

;; Get total supply
(define-read-only (get-total-supply)
  (ok (ft-get-supply usdcx))
)

;; Get token URI
(define-read-only (get-token-uri)
  (ok (some u"https://www.circle.com/usdc"))
)

;; Mint function (for testing only)
(define-public (mint (amount uint) (recipient principal))
  (begin
    (try! (ft-mint? usdcx amount recipient))
    (ok true)
  )
)

;; Initialize test wallets with USDCx
(define-public (init-test-wallets)
  (begin
    ;; This would be called once to give test wallets some USDCx
    (ok true)
  )
)
