;; USDCx Token Interface
;; Wrapper contract for interacting with USDCx (USDC-backed stablecoin on Stacks via Circle xReserve)
;; Implements SIP-010 fungible token standard
;; Note: In production, this would call the actual USDCx contract via Circle xReserve
;; For testing, we use an internal token implementation

;; ============================================
;; Trait Implementation
;; ============================================

(impl-trait .sip010-ft-trait.sip010-ft-trait)

;; ============================================
;; Token Definition
;; ============================================

(define-fungible-token usdcx u1000000000000000) ;; 1 billion USDCx max supply

;; ============================================
;; Constants
;; ============================================

(define-constant CONTRACT-OWNER tx-sender)

;; Error codes
(define-constant ERR-UNAUTHORIZED (err u500))
(define-constant ERR-NOT-TOKEN-OWNER (err u501))
(define-constant ERR-INSUFFICIENT-BALANCE (err u502))
(define-constant ERR-TRANSFER-FAILED (err u503))

;; ============================================
;; SIP-010 Functions
;; ============================================

;; Transfer tokens
(define-public (transfer
  (amount uint)
  (sender principal)
  (recipient principal)
  (memo (optional (buff 34))))
  (begin
    (asserts! (is-eq tx-sender sender) ERR-NOT-TOKEN-OWNER)
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
  (ok "USDCx")
)

;; Get token symbol
(define-read-only (get-symbol)
  (ok "USDCx")
)

;; Get decimals (USDC uses 6 decimals)
(define-read-only (get-decimals)
  (ok u6)
)

;; Get balance of an account
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

;; ============================================
;; Vault Helper Functions
;; ============================================

;; Transfer USDCx from user to vault (called by vault contract)
(define-public (transfer-to-vault (amount uint) (sender principal))
  (begin
    ;; Transfer from sender to this contract (vault holds funds here)
    (try! (ft-transfer? usdcx amount sender (as-contract tx-sender)))
    (ok amount)
  )
)

;; Transfer USDCx from vault to user (called by vault contract)
(define-public (transfer-from-vault (amount uint) (recipient principal))
  (begin
    ;; Transfer from this contract to recipient
    (try! (as-contract (ft-transfer? usdcx amount tx-sender recipient)))
    (ok amount)
  )
)

;; ============================================
;; Minting Functions (for testing)
;; ============================================

;; Mint function (for testing only - in production this would be controlled by Circle)
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
