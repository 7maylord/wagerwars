;; USDCx Token Interface
;; Wrapper contract for interacting with USDCx (USDC-backed stablecoin on Stacks via Circle xReserve)
;; Implements SIP-010 fungible token standard

;; ============================================
;; Trait Implementation
;; ============================================

(impl-trait .sip010-ft-trait.sip010-ft-trait)

;; ============================================
;; Constants
;; ============================================

(define-constant CONTRACT-OWNER tx-sender)

;; In production, this would be the actual USDCx contract address on mainnet
;; For testnet/devnet, we'll mock it
(define-constant USDCX-CONTRACT .mock-usdcx)

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
    ;; In production, this would call the actual USDCx contract
    ;; For now, we'll use our mock implementation
    (contract-call? USDCX-CONTRACT transfer amount sender recipient memo)
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
  (contract-call? USDCX-CONTRACT get-balance account)
)

;; Get total supply
(define-read-only (get-total-supply)
  (contract-call? USDCX-CONTRACT get-total-supply)
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
    ;; Transfer from sender to contract
    (try! (contract-call? USDCX-CONTRACT transfer
                          amount
                          sender
                          (as-contract tx-sender)
                          none))
    (ok amount)
  )
)

;; Transfer USDCx from vault to user (called by vault contract)
(define-public (transfer-from-vault (amount uint) (recipient principal))
  (begin
    ;; Transfer from contract to recipient
    (try! (as-contract (contract-call? USDCX-CONTRACT transfer
                                       amount
                                       tx-sender
                                       recipient
                                       none)))
    (ok amount)
  )
)

;; ============================================
;; Mock USDCx Contract (for testing)
;; ============================================
;; This will be replaced with the real USDCx contract on mainnet
;; For devnet testing, we implement a simple fungible token

(define-fungible-token usdcx-mock)

(define-public (mint-mock (amount uint) (recipient principal))
  (begin
    ;; Only for testing - remove in production
    (try! (ft-mint? usdcx-mock amount recipient))
    (ok true)
  )
)
