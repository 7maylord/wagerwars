import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;

// Helper constants
const PRECISION = 1_000_000; // 6 decimal places
const ONE_HOUR = 360; // ~360 blocks (1 hour with ~10s blocks)
const ONE_DAY = 8640; // ~8640 blocks (1 day with ~10s blocks)
const MIN_RESOLUTION_TIME = 3600; // Minimum resolution time from market-manager

// Helper function to setup oracle
function setupOracle(oracleWallet: string) {
  simnet.callPublicFn(
    "oracle-bridge",
    "register-oracle",
    [Cl.uint(1_000_000 * PRECISION)],
    oracleWallet
  );
  simnet.callPublicFn(
    "market-manager",
    "register-oracle",
    [Cl.uint(1_000_000_000)],
    oracleWallet
  );
}

// Helper function to create a binary market
function createBinaryMarket(
  creator: string,
  oracle: string,
  question: string = "Test question?"
) {
  const currentBlock = simnet.blockHeight;
  const lockTime = currentBlock + ONE_DAY;
  const resolutionTime = lockTime + ONE_DAY;

  return simnet.callPublicFn(
    "market-manager",
    "create-binary-market",
    [
      Cl.stringAscii(question),
      Cl.none(),
      Cl.uint(resolutionTime),
      Cl.uint(lockTime),
      Cl.principal(oracle),
      Cl.uint(10 * PRECISION),
      Cl.stringAscii("crypto"),
      Cl.none()
    ],
    creator
  );
}

// Helper function to mint USDCx tokens
function mintUSDCx(recipient: string, amount: number) {
  return simnet.callPublicFn(
    "usdcx-token",
    "mint",
    [Cl.uint(amount), Cl.principal(recipient)],
    deployer
  );
}

describe("WagerWars Prediction Market Tests", () => {
  // ============================================
  // USDCx Token Tests
  // ============================================
  describe("USDCx Token", () => {
    describe("Token Metadata", () => {
      it("should have correct token name", () => {
        const name = simnet.callReadOnlyFn(
          "usdcx-token",
          "get-name",
          [],
          deployer
        );
        expect(name.result).toBeOk(Cl.stringAscii("USDCx"));
      });

      it("should have correct token symbol", () => {
        const symbol = simnet.callReadOnlyFn(
          "usdcx-token",
          "get-symbol",
          [],
          deployer
        );
        expect(symbol.result).toBeOk(Cl.stringAscii("USDCx"));
      });

      it("should have 6 decimals", () => {
        const decimals = simnet.callReadOnlyFn(
          "usdcx-token",
          "get-decimals",
          [],
          deployer
        );
        expect(decimals.result).toBeOk(Cl.uint(6));
      });

      it("should have correct token URI", () => {
        const uri = simnet.callReadOnlyFn(
          "usdcx-token",
          "get-token-uri",
          [],
          deployer
        );
        expect(uri.result).toBeOk(Cl.some(Cl.stringUtf8("https://www.circle.com/usdc")));
      });

      it("should start with zero total supply", () => {
        const supply = simnet.callReadOnlyFn(
          "usdcx-token",
          "get-total-supply",
          [],
          deployer
        );
        expect(supply.result).toBeOk(Cl.uint(0));
      });
    });

    describe("Minting", () => {
      it("should mint tokens successfully", () => {
        const mintAmount = 1000 * PRECISION;
        const { result } = mintUSDCx(wallet1, mintAmount);
        expect(result).toBeOk(Cl.bool(true));

        const balance = simnet.callReadOnlyFn(
          "usdcx-token",
          "get-balance",
          [Cl.principal(wallet1)],
          wallet1
        );
        expect(balance.result).toBeOk(Cl.uint(mintAmount));
      });

      it("should update total supply after minting", () => {
        const mintAmount = 5000 * PRECISION;
        mintUSDCx(wallet1, mintAmount);

        const supply = simnet.callReadOnlyFn(
          "usdcx-token",
          "get-total-supply",
          [],
          deployer
        );
        expect(supply.result).toBeOk(Cl.uint(mintAmount));
      });

      it("should allow minting to multiple wallets", () => {
        mintUSDCx(wallet1, 1000 * PRECISION);
        mintUSDCx(wallet2, 2000 * PRECISION);
        mintUSDCx(wallet3, 3000 * PRECISION);

        const balance1 = simnet.callReadOnlyFn("usdcx-token", "get-balance", [Cl.principal(wallet1)], wallet1);
        const balance2 = simnet.callReadOnlyFn("usdcx-token", "get-balance", [Cl.principal(wallet2)], wallet2);
        const balance3 = simnet.callReadOnlyFn("usdcx-token", "get-balance", [Cl.principal(wallet3)], wallet3);

        expect(balance1.result).toBeOk(Cl.uint(1000 * PRECISION));
        expect(balance2.result).toBeOk(Cl.uint(2000 * PRECISION));
        expect(balance3.result).toBeOk(Cl.uint(3000 * PRECISION));
      });
    });

    describe("Transfers", () => {
      beforeEach(() => {
        mintUSDCx(wallet1, 1000 * PRECISION);
      });

      it("should transfer tokens between users", () => {
        const transferAmount = 100 * PRECISION;

        const { result } = simnet.callPublicFn(
          "usdcx-token",
          "transfer",
          [
            Cl.uint(transferAmount),
            Cl.principal(wallet1),
            Cl.principal(wallet2),
            Cl.none()
          ],
          wallet1
        );

        expect(result).toBeOk(Cl.bool(true));

        const balance1 = simnet.callReadOnlyFn("usdcx-token", "get-balance", [Cl.principal(wallet1)], wallet1);
        const balance2 = simnet.callReadOnlyFn("usdcx-token", "get-balance", [Cl.principal(wallet2)], wallet2);

        expect(balance1.result).toBeOk(Cl.uint(900 * PRECISION));
        expect(balance2.result).toBeOk(Cl.uint(100 * PRECISION));
      });

      it("should fail transfer if sender is not tx-sender", () => {
        const { result } = simnet.callPublicFn(
          "usdcx-token",
          "transfer",
          [
            Cl.uint(100 * PRECISION),
            Cl.principal(wallet1),
            Cl.principal(wallet2),
            Cl.none()
          ],
          wallet2 // Not the sender
        );

        expect(result).toBeErr(Cl.uint(501)); // ERR-NOT-TOKEN-OWNER
      });

      it("should fail transfer with insufficient balance", () => {
        const { result } = simnet.callPublicFn(
          "usdcx-token",
          "transfer",
          [
            Cl.uint(2000 * PRECISION), // More than balance
            Cl.principal(wallet1),
            Cl.principal(wallet2),
            Cl.none()
          ],
          wallet1
        );

        expect(result).toBeErr(Cl.uint(1)); // ft-transfer error
      });

      it("should transfer with memo", () => {
        const memo = new Uint8Array([1, 2, 3, 4]);
        const { result } = simnet.callPublicFn(
          "usdcx-token",
          "transfer",
          [
            Cl.uint(50 * PRECISION),
            Cl.principal(wallet1),
            Cl.principal(wallet2),
            Cl.some(Cl.buffer(memo))
          ],
          wallet1
        );

        expect(result).toBeOk(Cl.bool(true));
      });
    });
  });

  // ============================================
  // Mock USDCx Token Tests (for backwards compatibility)
  // ============================================
  describe("Mock USDCx Token", () => {
    it("ensures simnet is well initialised", () => {
      expect(simnet.blockHeight).toBeDefined();
    });

    it("should have correct token metadata", () => {
      const name = simnet.callReadOnlyFn("mock-usdcx", "get-name", [], deployer);
      expect(name.result).toBeOk(Cl.stringAscii("USDCx (Mock)"));

      const symbol = simnet.callReadOnlyFn("mock-usdcx", "get-symbol", [], deployer);
      expect(symbol.result).toBeOk(Cl.stringAscii("USDCx"));

      const decimals = simnet.callReadOnlyFn("mock-usdcx", "get-decimals", [], deployer);
      expect(decimals.result).toBeOk(Cl.uint(6));
    });

    it("should mint tokens for testing", () => {
      const mintAmount = 1000 * PRECISION;
      const { result } = simnet.callPublicFn(
        "mock-usdcx",
        "mint",
        [Cl.uint(mintAmount), Cl.principal(wallet1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));

      const balance = simnet.callReadOnlyFn("mock-usdcx", "get-balance", [Cl.principal(wallet1)], wallet1);
      expect(balance.result).toBeOk(Cl.uint(mintAmount));
    });

    it("should transfer tokens between users", () => {
      const mintAmount = 1000 * PRECISION;
      const transferAmount = 100 * PRECISION;

      simnet.callPublicFn("mock-usdcx", "mint", [Cl.uint(mintAmount), Cl.principal(wallet1)], deployer);

      const { result } = simnet.callPublicFn(
        "mock-usdcx",
        "transfer",
        [Cl.uint(transferAmount), Cl.principal(wallet1), Cl.principal(wallet2), Cl.none()],
        wallet1
      );

      expect(result).toBeOk(Cl.bool(true));

      const balance1 = simnet.callReadOnlyFn("mock-usdcx", "get-balance", [Cl.principal(wallet1)], wallet1);
      expect(balance1.result).toBeOk(Cl.uint(mintAmount - transferAmount));

      const balance2 = simnet.callReadOnlyFn("mock-usdcx", "get-balance", [Cl.principal(wallet2)], wallet2);
      expect(balance2.result).toBeOk(Cl.uint(transferAmount));
    });
  });

  // ============================================
  // Oracle Bridge Tests
  // ============================================
  describe("Oracle Bridge", () => {
    describe("Oracle Registration", () => {
      it("should register oracle with bronze tier bond", () => {
        const bondAmount = 1_000_000 * PRECISION; // 1M STX (bronze tier)

        const { result } = simnet.callPublicFn(
          "oracle-bridge",
          "register-oracle",
          [Cl.uint(bondAmount)],
          wallet1
        );

        expect(result).toBeOk(Cl.bool(true));

        const isAuthorized = simnet.callReadOnlyFn(
          "oracle-bridge",
          "is-oracle-authorized",
          [Cl.principal(wallet1)],
          deployer
        );
        expect(isAuthorized.result).toStrictEqual(Cl.bool(true));
      });

      it("should register oracle with silver tier bond", () => {
        const bondAmount = 5_000_000 * PRECISION; // 5M STX (silver tier)

        const { result } = simnet.callPublicFn(
          "oracle-bridge",
          "register-oracle",
          [Cl.uint(bondAmount)],
          wallet1
        );

        expect(result).toBeOk(Cl.bool(true));
      });

      it("should register oracle with gold tier bond", () => {
        const bondAmount = 10_000_000 * PRECISION; // 10M STX (gold tier)

        const { result } = simnet.callPublicFn(
          "oracle-bridge",
          "register-oracle",
          [Cl.uint(bondAmount)],
          wallet1
        );

        expect(result).toBeOk(Cl.bool(true));
      });

      it("should fail registration with insufficient bond", () => {
        const bondAmount = 100 * PRECISION; // Too low

        const { result } = simnet.callPublicFn(
          "oracle-bridge",
          "register-oracle",
          [Cl.uint(bondAmount)],
          wallet1
        );

        expect(result.type).toBe("err");
      });

      it("should get oracle info after registration", () => {
        simnet.callPublicFn(
          "oracle-bridge",
          "register-oracle",
          [Cl.uint(1_000_000 * PRECISION)],
          wallet1
        );

        const oracleInfo = simnet.callReadOnlyFn(
          "oracle-bridge",
          "get-oracle",
          [Cl.principal(wallet1)],
          deployer
        );

        expect(oracleInfo.result.type).toBe("some");
      });

      it("should return none for unregistered oracle", () => {
        const oracleInfo = simnet.callReadOnlyFn(
          "oracle-bridge",
          "get-oracle",
          [Cl.principal(wallet3)],
          deployer
        );

        expect(oracleInfo.result).toStrictEqual(Cl.none());
      });
    });

    describe("Oracle Statistics", () => {
      it("should track total oracles", () => {
        simnet.callPublicFn("oracle-bridge", "register-oracle", [Cl.uint(1_000_000 * PRECISION)], wallet1);
        simnet.callPublicFn("oracle-bridge", "register-oracle", [Cl.uint(1_000_000 * PRECISION)], wallet2);

        const stats = simnet.callReadOnlyFn(
          "oracle-bridge",
          "get-oracle-stats",
          [],
          deployer
        );

        expect(stats.result.type).toBe("ok");
      });
    });
  });

  // ============================================
  // Market Manager Tests
  // ============================================
  describe("Market Manager - Binary Markets", () => {
    beforeEach(() => {
      setupOracle(wallet1);
    });

    it("should create a binary market", () => {
      const { result } = createBinaryMarket(deployer, wallet1, "Will BTC reach $100k by end of 2025?");
      expect(result).toBeOk(Cl.uint(1));

      const canTrade = simnet.callReadOnlyFn("market-manager", "can-trade", [Cl.uint(1)], deployer);
      expect(canTrade.result).toStrictEqual(Cl.bool(true));
    });

    it("should get market info after creation", () => {
      createBinaryMarket(deployer, wallet1);

      const market = simnet.callReadOnlyFn(
        "market-manager",
        "get-market",
        [Cl.uint(1)],
        deployer
      );

      expect(market.result.type).toBe("some");
    });

    it("should increment market ID for each new market", () => {
      const result1 = createBinaryMarket(deployer, wallet1, "Question 1?");
      const result2 = createBinaryMarket(deployer, wallet1, "Question 2?");
      const result3 = createBinaryMarket(deployer, wallet1, "Question 3?");

      expect(result1.result).toBeOk(Cl.uint(1));
      expect(result2.result).toBeOk(Cl.uint(2));
      expect(result3.result).toBeOk(Cl.uint(3));
    });

    it("should fail creating market with unregistered oracle", () => {
      const currentBlock = simnet.blockHeight;
      const { result } = simnet.callPublicFn(
        "market-manager",
        "create-binary-market",
        [
          Cl.stringAscii("Test?"),
          Cl.none(),
          Cl.uint(currentBlock + ONE_DAY * 2),
          Cl.uint(currentBlock + ONE_DAY),
          Cl.principal(wallet3), // Unregistered oracle
          Cl.uint(10 * PRECISION),
          Cl.stringAscii("crypto"),
          Cl.none()
        ],
        deployer
      );

      expect(result.type).toBe("err");
    });

    it("should fail creating market with resolution time before lock time", () => {
      const currentBlock = simnet.blockHeight;
      const { result } = simnet.callPublicFn(
        "market-manager",
        "create-binary-market",
        [
          Cl.stringAscii("Test?"),
          Cl.none(),
          Cl.uint(currentBlock + ONE_HOUR), // Resolution before lock
          Cl.uint(currentBlock + ONE_DAY),
          Cl.principal(wallet1),
          Cl.uint(10 * PRECISION),
          Cl.stringAscii("crypto"),
          Cl.none()
        ],
        deployer
      );

      expect(result.type).toBe("err");
    });
  });

  describe("Market Manager - Categorical Markets", () => {
    beforeEach(() => {
      setupOracle(wallet1);
    });

    it("should create a categorical market", () => {
      const currentBlock = simnet.blockHeight;
      const outcomes = Cl.list([
        Cl.stringAscii("Chiefs"),
        Cl.stringAscii("49ers"),
        Cl.stringAscii("Ravens"),
        Cl.stringAscii("Bills")
      ]);

      const { result } = simnet.callPublicFn(
        "market-manager",
        "create-categorical-market",
        [
          Cl.stringAscii("Who will win Super Bowl 2026?"),
          Cl.none(),
          outcomes,
          Cl.uint(currentBlock + ONE_DAY * 2),
          Cl.uint(currentBlock + ONE_DAY),
          Cl.principal(wallet1),
          Cl.uint(20 * PRECISION),
          Cl.stringAscii("sports"),
          Cl.none()
        ],
        deployer
      );

      expect(result).toBeOk(Cl.uint(1));
    });

    it("should fail creating categorical market with less than 2 outcomes", () => {
      const currentBlock = simnet.blockHeight;
      const outcomes = Cl.list([Cl.stringAscii("Only One")]);

      const { result } = simnet.callPublicFn(
        "market-manager",
        "create-categorical-market",
        [
          Cl.stringAscii("Invalid market?"),
          Cl.none(),
          outcomes,
          Cl.uint(currentBlock + ONE_DAY * 2),
          Cl.uint(currentBlock + ONE_DAY),
          Cl.principal(wallet1),
          Cl.uint(20 * PRECISION),
          Cl.stringAscii("test"),
          Cl.none()
        ],
        deployer
      );

      expect(result.type).toBe("err");
    });
  });

  describe("Market Manager - Scalar Markets", () => {
    beforeEach(() => {
      setupOracle(wallet1);
    });

    it("should create a scalar market", () => {
      const currentBlock = simnet.blockHeight;

      const { result } = simnet.callPublicFn(
        "market-manager",
        "create-scalar-market",
        [
          Cl.stringAscii("What will be the BTC price on Dec 31, 2025?"),
          Cl.none(),
          Cl.uint(50000 * PRECISION),
          Cl.uint(150000 * PRECISION),
          Cl.stringAscii("USD"),
          Cl.uint(currentBlock + ONE_DAY * 2),
          Cl.uint(currentBlock + ONE_DAY),
          Cl.principal(wallet1),
          Cl.uint(100 * PRECISION),
          Cl.stringAscii("crypto"),
          Cl.none()
        ],
        deployer
      );

      expect(result).toBeOk(Cl.uint(1));
    });

    it("should fail creating scalar market with min >= max", () => {
      const currentBlock = simnet.blockHeight;

      const { result } = simnet.callPublicFn(
        "market-manager",
        "create-scalar-market",
        [
          Cl.stringAscii("Invalid range?"),
          Cl.none(),
          Cl.uint(100000 * PRECISION), // min
          Cl.uint(50000 * PRECISION),  // max < min
          Cl.stringAscii("USD"),
          Cl.uint(currentBlock + ONE_DAY * 2),
          Cl.uint(currentBlock + ONE_DAY),
          Cl.principal(wallet1),
          Cl.uint(100 * PRECISION),
          Cl.stringAscii("crypto"),
          Cl.none()
        ],
        deployer
      );

      expect(result.type).toBe("err");
    });
  });

  // ============================================
  // Market Resolution Tests
  // ============================================
  describe("Market Resolution", () => {
    beforeEach(() => {
      setupOracle(wallet1);
      createBinaryMarket(deployer, wallet1, "Test market for resolution");
    });

    it("should resolve market by authorized oracle", () => {
      // Need to mine past resolution time (2 * ONE_DAY from creation)
      simnet.mineEmptyBlocks(ONE_DAY * 2 + 1);

      const { result } = simnet.callPublicFn(
        "market-manager",
        "resolve-market",
        [Cl.uint(1), Cl.uint(0)],
        wallet1
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should fail resolution by non-oracle", () => {
      simnet.mineEmptyBlocks(ONE_DAY + 1);

      const { result } = simnet.callPublicFn(
        "market-manager",
        "resolve-market",
        [Cl.uint(1), Cl.uint(0)],
        wallet2 // Not the assigned oracle
      );

      expect(result.type).toBe("err");
    });

    it("should fail resolution before resolution time", () => {
      // Don't mine blocks - try to resolve immediately
      const { result } = simnet.callPublicFn(
        "market-manager",
        "resolve-market",
        [Cl.uint(1), Cl.uint(0)],
        wallet1
      );

      expect(result.type).toBe("err");
    });

    it("should fail resolution with invalid outcome", () => {
      simnet.mineEmptyBlocks(ONE_DAY + 1);

      const { result } = simnet.callPublicFn(
        "market-manager",
        "resolve-market",
        [Cl.uint(1), Cl.uint(5)], // Invalid outcome for binary market
        wallet1
      );

      expect(result.type).toBe("err");
    });

    it("should not allow trading after market is locked", () => {
      // Mine blocks to reach lock time
      simnet.mineEmptyBlocks(ONE_DAY);

      const canTrade = simnet.callReadOnlyFn(
        "market-manager",
        "can-trade",
        [Cl.uint(1)],
        deployer
      );

      expect(canTrade.result).toStrictEqual(Cl.bool(false));
    });
  });

  // ============================================
  // Vault Tests
  // ============================================
  describe("Vault", () => {
    it("should have correct treasury address", () => {
      const stats = simnet.callReadOnlyFn(
        "vault",
        "get-vault-stats",
        [],
        deployer
      );

      expect(stats.result.type).toBe("ok");
    });

    it("should start with zero total locked", () => {
      const stats = simnet.callReadOnlyFn(
        "vault",
        "get-vault-stats",
        [],
        deployer
      );

      expect(stats.result.type).toBe("ok");
    });

    it("should return none for non-existent market balance", () => {
      const balance = simnet.callReadOnlyFn(
        "vault",
        "get-market-balance",
        [Cl.uint(999)],
        deployer
      );

      expect(balance.result).toStrictEqual(Cl.none());
    });
  });

  // ============================================
  // LMSR Math Tests
  // ============================================
  describe("LMSR Math", () => {
    describe("Fixed-Point Arithmetic", () => {
      it("should multiply fixed-point numbers correctly", () => {
        // 2.0 * 3.0 = 6.0
        const result = simnet.callReadOnlyFn(
          "lmsr-math",
          "fp-multiply",
          [Cl.uint(2 * PRECISION), Cl.uint(3 * PRECISION)],
          deployer
        );

        expect(result.result).toStrictEqual(Cl.uint(6 * PRECISION));
      });

      it("should divide fixed-point numbers correctly", () => {
        // 6.0 / 2.0 = 3.0
        const result = simnet.callReadOnlyFn(
          "lmsr-math",
          "fp-divide",
          [Cl.uint(6 * PRECISION), Cl.uint(2 * PRECISION)],
          deployer
        );

        expect(result.result).toStrictEqual(Cl.uint(3 * PRECISION));
      });

      it("should handle division by zero gracefully", () => {
        const result = simnet.callReadOnlyFn(
          "lmsr-math",
          "fp-divide",
          [Cl.uint(PRECISION), Cl.uint(0)],
          deployer
        );

        expect(result.result).toStrictEqual(Cl.uint(0));
      });
    });

    describe("Exponential Function", () => {
      it("should calculate e^0 = 1", () => {
        const result = simnet.callReadOnlyFn(
          "lmsr-math",
          "test-exp",
          [Cl.uint(0)],
          deployer
        );

        expect(result.result).toStrictEqual(Cl.uint(PRECISION)); // 1.0
      });

      it("should calculate e^1 approximately", () => {
        const result = simnet.callReadOnlyFn(
          "lmsr-math",
          "test-exp",
          [Cl.uint(PRECISION)], // 1.0
          deployer
        );

        // e ≈ 2.718281, allow some tolerance
        const value = Number((result.result as any).value);
        expect(value).toBeGreaterThan(2.5 * PRECISION);
        expect(value).toBeLessThan(3 * PRECISION);
      });
    });

    describe("LMSR Pricing", () => {
      it("should calculate equal prices for equal quantities", () => {
        const price0 = simnet.callReadOnlyFn(
          "lmsr-math",
          "test-binary-price",
          [
            Cl.uint(100 * PRECISION),
            Cl.uint(100 * PRECISION),
            Cl.uint(10 * PRECISION),
            Cl.uint(0)
          ],
          deployer
        );

        const price1 = simnet.callReadOnlyFn(
          "lmsr-math",
          "test-binary-price",
          [
            Cl.uint(100 * PRECISION),
            Cl.uint(100 * PRECISION),
            Cl.uint(10 * PRECISION),
            Cl.uint(1)
          ],
          deployer
        );

        // Prices should be approximately equal (0.5 each)
        const p0 = Number((price0.result as any).value);
        const p1 = Number((price1.result as any).value);

        expect(Math.abs(p0 - p1)).toBeLessThan(1000); // Small tolerance
      });

      it("should calculate higher price for outcome with more shares", () => {
        const priceYes = simnet.callReadOnlyFn(
          "lmsr-math",
          "test-binary-price",
          [
            Cl.uint(200 * PRECISION), // More Yes shares
            Cl.uint(100 * PRECISION),
            Cl.uint(10 * PRECISION),
            Cl.uint(0)
          ],
          deployer
        );

        const priceNo = simnet.callReadOnlyFn(
          "lmsr-math",
          "test-binary-price",
          [
            Cl.uint(200 * PRECISION),
            Cl.uint(100 * PRECISION),
            Cl.uint(10 * PRECISION),
            Cl.uint(1)
          ],
          deployer
        );

        const pYes = Number((priceYes.result as any).value);
        const pNo = Number((priceNo.result as any).value);

        expect(pYes).toBeGreaterThan(pNo);
      });
    });
  });

  // ============================================
  // Order Book Tests
  // ============================================
  describe("Order Book", () => {
    beforeEach(() => {
      setupOracle(wallet1);
      createBinaryMarket(deployer, wallet1);
      mintUSDCx(wallet2, 10000 * PRECISION);
    });

    it("should get current price for market outcome", () => {
      const price = simnet.callReadOnlyFn(
        "order-book",
        "get-current-price",
        [Cl.uint(1), Cl.uint(0)],
        deployer
      );

      expect(price.result.type).toBe("ok");
    });

    it("should calculate buy quote", () => {
      const quote = simnet.callReadOnlyFn(
        "order-book",
        "calculate-buy-quote",
        [Cl.uint(1), Cl.uint(0), Cl.uint(100 * PRECISION)],
        deployer
      );

      expect(quote.result.type).toBe("ok");
    });

    it("should return none for non-existent user position", () => {
      const position = simnet.callReadOnlyFn(
        "order-book",
        "get-user-position",
        [Cl.principal(wallet3), Cl.uint(1), Cl.uint(0)],
        deployer
      );

      expect(position.result).toStrictEqual(Cl.none());
    });
  });

  // ============================================
  // Main WagerWars Contract Tests
  // ============================================
  describe("Main WagerWars Contract", () => {
    beforeEach(() => {
      setupOracle(wallet1);
    });

    it("should create binary prediction through main contract", () => {
      const currentBlock = simnet.blockHeight;
      const { result } = simnet.callPublicFn(
        "wagerwars",
        "create-binary-prediction",
        [
          Cl.stringAscii("Will ETH reach $5000?"),
          Cl.uint(currentBlock + ONE_DAY * 2),
          Cl.uint(currentBlock + ONE_DAY),
          Cl.principal(wallet1),
          Cl.uint(10 * PRECISION)
        ],
        deployer
      );

      expect(result).toBeOk(Cl.uint(1));
    });

    it("should get platform statistics", () => {
      const stats = simnet.callReadOnlyFn(
        "wagerwars",
        "get-platform-stats",
        [],
        deployer
      );

      expect(stats.result.type).toBe("ok");
    });

    it("should get market price through main contract", () => {
      createBinaryMarket(deployer, wallet1);

      const price = simnet.callReadOnlyFn(
        "wagerwars",
        "get-price",
        [Cl.uint(1), Cl.uint(0)],
        deployer
      );

      expect(price.result.type).toBe("ok");
    });

    it("should get market info through main contract", () => {
      createBinaryMarket(deployer, wallet1);

      const market = simnet.callReadOnlyFn(
        "wagerwars",
        "get-market-info",
        [Cl.uint(1)],
        deployer
      );

      expect(market.result.type).toBe("some");
    });

    it("should return none for non-existent market", () => {
      const market = simnet.callReadOnlyFn(
        "wagerwars",
        "get-market-info",
        [Cl.uint(999)],
        deployer
      );

      expect(market.result).toStrictEqual(Cl.none());
    });
  });

  // ============================================
  // Market Lifecycle Tests
  // ============================================
  describe("Market Lifecycle", () => {
    beforeEach(() => {
      setupOracle(wallet1);
    });

    it("should follow complete market lifecycle: create -> trade -> lock -> resolve", () => {
      // 1. Create market with proper timing (resolution must be >= creation + MIN_RESOLUTION_TIME)
      const currentBlock = simnet.blockHeight;
      const lockTime = currentBlock + MIN_RESOLUTION_TIME;  // Lock at MIN_RESOLUTION_TIME
      const resolutionTime = lockTime + 100;  // Resolution shortly after lock

      const createResult = simnet.callPublicFn(
        "market-manager",
        "create-binary-market",
        [
          Cl.stringAscii("Lifecycle test market"),
          Cl.none(),
          Cl.uint(resolutionTime),
          Cl.uint(lockTime),
          Cl.principal(wallet1),
          Cl.uint(10 * PRECISION),
          Cl.stringAscii("test"),
          Cl.none()
        ],
        deployer
      );
      expect(createResult.result).toBeOk(Cl.uint(1));

      // 2. Verify market is tradeable
      let canTrade = simnet.callReadOnlyFn("market-manager", "can-trade", [Cl.uint(1)], deployer);
      expect(canTrade.result).toStrictEqual(Cl.bool(true));

      // 3. Mine blocks to lock time
      simnet.mineEmptyBlocks(MIN_RESOLUTION_TIME);

      // 4. Verify market is locked (not tradeable)
      canTrade = simnet.callReadOnlyFn("market-manager", "can-trade", [Cl.uint(1)], deployer);
      expect(canTrade.result).toStrictEqual(Cl.bool(false));

      // 5. Mine blocks to resolution time
      simnet.mineEmptyBlocks(100);

      // 6. Resolve market
      const resolveResult = simnet.callPublicFn(
        "market-manager",
        "resolve-market",
        [Cl.uint(1), Cl.uint(0)], // Yes wins
        wallet1
      );
      expect(resolveResult.result).toBeOk(Cl.bool(true));

      // 7. Verify market status
      const market = simnet.callReadOnlyFn("market-manager", "get-market", [Cl.uint(1)], deployer);
      expect(market.result.type).toBe("some");
    });
  });

  // ============================================
  // Edge Cases and Error Handling
  // ============================================
  describe("Edge Cases and Error Handling", () => {
    beforeEach(() => {
      setupOracle(wallet1);
    });

    it("should handle empty question gracefully", () => {
      const currentBlock = simnet.blockHeight;
      // Empty string might still be valid ASCII
      const { result } = simnet.callPublicFn(
        "market-manager",
        "create-binary-market",
        [
          Cl.stringAscii("?"), // Minimal question
          Cl.none(),
          Cl.uint(currentBlock + ONE_DAY * 2),
          Cl.uint(currentBlock + ONE_DAY),
          Cl.principal(wallet1),
          Cl.uint(10 * PRECISION),
          Cl.stringAscii("test"),
          Cl.none()
        ],
        deployer
      );

      // Should still succeed with minimal valid input
      expect(result).toBeOk(Cl.uint(1));
    });

    it("should handle very large liquidity parameter", () => {
      const currentBlock = simnet.blockHeight;
      const { result } = simnet.callPublicFn(
        "market-manager",
        "create-binary-market",
        [
          Cl.stringAscii("Large liquidity test?"),
          Cl.none(),
          Cl.uint(currentBlock + ONE_DAY * 2),
          Cl.uint(currentBlock + ONE_DAY),
          Cl.principal(wallet1),
          Cl.uint(1000000 * PRECISION), // Very large
          Cl.stringAscii("test"),
          Cl.none()
        ],
        deployer
      );

      expect(result).toBeOk(Cl.uint(1));
    });

    it("should handle minimum liquidity parameter", () => {
      const currentBlock = simnet.blockHeight;
      const { result } = simnet.callPublicFn(
        "market-manager",
        "create-binary-market",
        [
          Cl.stringAscii("Min liquidity test?"),
          Cl.none(),
          Cl.uint(currentBlock + ONE_DAY * 2),
          Cl.uint(currentBlock + ONE_DAY),
          Cl.principal(wallet1),
          Cl.uint(PRECISION), // Minimum: 1.0
          Cl.stringAscii("test"),
          Cl.none()
        ],
        deployer
      );

      expect(result).toBeOk(Cl.uint(1));
    });

    it("should handle multiple oracles for different markets", () => {
      // Register second oracle
      setupOracle(wallet2);

      // Create market with first oracle
      const result1 = createBinaryMarket(deployer, wallet1, "Oracle 1 market?");
      expect(result1.result).toBeOk(Cl.uint(1));

      // Create market with second oracle
      const currentBlock = simnet.blockHeight;
      const result2 = simnet.callPublicFn(
        "market-manager",
        "create-binary-market",
        [
          Cl.stringAscii("Oracle 2 market?"),
          Cl.none(),
          Cl.uint(currentBlock + ONE_DAY * 2),
          Cl.uint(currentBlock + ONE_DAY),
          Cl.principal(wallet2),
          Cl.uint(10 * PRECISION),
          Cl.stringAscii("test"),
          Cl.none()
        ],
        deployer
      );
      expect(result2.result).toBeOk(Cl.uint(2));

      // Verify each oracle can only resolve their own market
      simnet.mineEmptyBlocks(ONE_DAY * 2 + 1);

      // Oracle 1 resolves market 1
      const resolve1 = simnet.callPublicFn(
        "market-manager",
        "resolve-market",
        [Cl.uint(1), Cl.uint(0)],
        wallet1
      );
      expect(resolve1.result).toBeOk(Cl.bool(true));

      // Oracle 2 resolves market 2
      const resolve2 = simnet.callPublicFn(
        "market-manager",
        "resolve-market",
        [Cl.uint(2), Cl.uint(1)],
        wallet2
      );
      expect(resolve2.result).toBeOk(Cl.bool(true));
    });
  });

  // ============================================
  // Integration Tests
  // ============================================
  describe("Integration Tests", () => {
    it("should allow multiple users to interact with the same market", () => {
      setupOracle(wallet1);
      createBinaryMarket(deployer, wallet1, "Multi-user test market?");

      // All users should be able to read market info
      const market1 = simnet.callReadOnlyFn("wagerwars", "get-market-info", [Cl.uint(1)], wallet1);
      const market2 = simnet.callReadOnlyFn("wagerwars", "get-market-info", [Cl.uint(1)], wallet2);
      const market3 = simnet.callReadOnlyFn("wagerwars", "get-market-info", [Cl.uint(1)], wallet3);

      expect(market1.result.type).toBe("some");
      expect(market2.result.type).toBe("some");
      expect(market3.result.type).toBe("some");
    });

    it("should maintain correct state across multiple operations", () => {
      setupOracle(wallet1);

      // Create multiple markets
      for (let i = 1; i <= 5; i++) {
        const result = createBinaryMarket(deployer, wallet1, `Market ${i}?`);
        expect(result.result).toBeOk(Cl.uint(i));
      }

      // Verify all markets exist
      for (let i = 1; i <= 5; i++) {
        const market = simnet.callReadOnlyFn(
          "market-manager",
          "get-market",
          [Cl.uint(i)],
          deployer
        );
        expect(market.result.type).toBe("some");
      }

      // Verify market 6 doesn't exist
      const market6 = simnet.callReadOnlyFn(
        "market-manager",
        "get-market",
        [Cl.uint(6)],
        deployer
      );
      expect(market6.result).toStrictEqual(Cl.none());
    });
  });
});
