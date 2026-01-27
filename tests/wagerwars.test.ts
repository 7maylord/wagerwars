import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

// Helper constants
const PRECISION = 1_000_000; // 6 decimal places
const ONE_HOUR = 360; // ~360 blocks (1 hour with ~10s blocks)
const ONE_DAY = 8640; // ~8640 blocks (1 day with ~10s blocks)
const MIN_RESOLUTION_TIME = 3600; // Minimum resolution time from market-manager

describe("WagerWars Prediction Market Tests", () => {
  describe("Mock USDCx Token", () => {
    it("ensures simnet is well initialised", () => {
      expect(simnet.blockHeight).toBeDefined();
    });

    it("should have correct token metadata", () => {
      const name = simnet.callReadOnlyFn(
        "mock-usdcx",
        "get-name",
        [],
        deployer
      );
      expect(name.result).toBeOk(Cl.stringAscii("USDCx (Mock)"));

      const symbol = simnet.callReadOnlyFn(
        "mock-usdcx",
        "get-symbol",
        [],
        deployer
      );
      expect(symbol.result).toBeOk(Cl.stringAscii("USDCx"));

      const decimals = simnet.callReadOnlyFn(
        "mock-usdcx",
        "get-decimals",
        [],
        deployer
      );
      expect(decimals.result).toBeOk(Cl.uint(6));
    });

    it("should mint tokens for testing", () => {
      const mintAmount = 1000 * PRECISION; // 1000 USDCx

      const { result } = simnet.callPublicFn(
        "mock-usdcx",
        "mint",
        [Cl.uint(mintAmount), Cl.principal(wallet1)],
        deployer
      );

      expect(result).toBeOk(Cl.bool(true));

      // Check balance
      const balance = simnet.callReadOnlyFn(
        "mock-usdcx",
        "get-balance",
        [Cl.principal(wallet1)],
        wallet1
      );

      expect(balance.result).toBeOk(Cl.uint(mintAmount));
    });

    it("should transfer tokens between users", () => {
      const mintAmount = 1000 * PRECISION;
      const transferAmount = 100 * PRECISION;

      // Mint to wallet1
      simnet.callPublicFn(
        "mock-usdcx",
        "mint",
        [Cl.uint(mintAmount), Cl.principal(wallet1)],
        deployer
      );

      // Transfer from wallet1 to wallet2
      const { result } = simnet.callPublicFn(
        "mock-usdcx",
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

      // Check balances
      const balance1 = simnet.callReadOnlyFn(
        "mock-usdcx",
        "get-balance",
        [Cl.principal(wallet1)],
        wallet1
      );
      expect(balance1.result).toBeOk(Cl.uint(mintAmount - transferAmount));

      const balance2 = simnet.callReadOnlyFn(
        "mock-usdcx",
        "get-balance",
        [Cl.principal(wallet2)],
        wallet2
      );
      expect(balance2.result).toBeOk(Cl.uint(transferAmount));
    });
  });

  describe("Oracle Bridge", () => {
    it("should register oracle with bond", () => {
      const bondAmount = 1_000_000 * PRECISION; // 1M STX

      const { result } = simnet.callPublicFn(
        "oracle-bridge",
        "register-oracle",
        [Cl.uint(bondAmount)],
        wallet1
      );

      expect(result).toBeOk(Cl.bool(true));

      // Check oracle is authorized
      const isAuthorized = simnet.callReadOnlyFn(
        "oracle-bridge",
        "is-oracle-authorized",
        [Cl.principal(wallet1)],
        deployer
      );

      expect(isAuthorized.result).toStrictEqual(Cl.bool(true));
    });
  });

  describe("Market Manager - Binary Markets", () => {
    beforeEach(() => {
      // Register oracle in oracle-bridge (for bonding/slashing)
      simnet.callPublicFn(
        "oracle-bridge",
        "register-oracle",
        [Cl.uint(1_000_000 * PRECISION)],
        wallet1
      );

      // Register oracle in market-manager (for authorization)
      simnet.callPublicFn(
        "market-manager",
        "register-oracle",
        [Cl.uint(1_000_000_000)], // 1000 STX minimum
        wallet1
      );
    });

    it("should create a binary market", () => {
      const currentBlock = simnet.blockHeight;
      const lockTime = currentBlock + ONE_DAY;
      const resolutionTime = lockTime + ONE_DAY;

      const { result } = simnet.callPublicFn(
        "market-manager",
        "create-binary-market",
        [
          Cl.stringAscii("Will BTC reach $100k by end of 2025?"),
          Cl.none(),
          Cl.uint(resolutionTime),
          Cl.uint(lockTime),
          Cl.principal(wallet1), // oracle
          Cl.uint(10 * PRECISION), // liquidity param
          Cl.stringAscii("crypto"),
          Cl.none()
        ],
        deployer
      );

      expect(result).toBeOk(Cl.uint(1)); // Market ID 1

      // Check market can be traded
      const canTrade = simnet.callReadOnlyFn(
        "market-manager",
        "can-trade",
        [Cl.uint(1)],
        deployer
      );

      expect(canTrade.result).toStrictEqual(Cl.bool(true));
    });
  });

  describe("Market Manager - Categorical Markets", () => {
    beforeEach(() => {
      // Register oracle in both contracts
      simnet.callPublicFn(
        "oracle-bridge",
        "register-oracle",
        [Cl.uint(1_000_000 * PRECISION)],
        wallet1
      );

      simnet.callPublicFn(
        "market-manager",
        "register-oracle",
        [Cl.uint(1_000_000_000)],
        wallet1
      );
    });

    it("should create a categorical market", () => {
      const currentBlock = simnet.blockHeight;
      const lockTime = currentBlock + ONE_DAY;
      const resolutionTime = lockTime + ONE_DAY;

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
          Cl.uint(resolutionTime),
          Cl.uint(lockTime),
          Cl.principal(wallet1),
          Cl.uint(20 * PRECISION),
          Cl.stringAscii("sports"),
          Cl.none()
        ],
        deployer
      );

      expect(result).toBeOk(Cl.uint(1));
    });
  });

  describe("Market Manager - Scalar Markets", () => {
    beforeEach(() => {
      // Register oracle in both contracts
      simnet.callPublicFn(
        "oracle-bridge",
        "register-oracle",
        [Cl.uint(1_000_000 * PRECISION)],
        wallet1
      );

      simnet.callPublicFn(
        "market-manager",
        "register-oracle",
        [Cl.uint(1_000_000_000)],
        wallet1
      );
    });

    it("should create a scalar market", () => {
      const currentBlock = simnet.blockHeight;
      const lockTime = currentBlock + ONE_DAY;
      const resolutionTime = lockTime + ONE_DAY;

      const { result } = simnet.callPublicFn(
        "market-manager",
        "create-scalar-market",
        [
          Cl.stringAscii("What will be the BTC price on Dec 31, 2025?"),
          Cl.none(),
          Cl.uint(50000 * PRECISION), // min value $50k
          Cl.uint(150000 * PRECISION), // max value $150k
          Cl.stringAscii("USD"),
          Cl.uint(resolutionTime),
          Cl.uint(lockTime),
          Cl.principal(wallet1),
          Cl.uint(100 * PRECISION),
          Cl.stringAscii("crypto"),
          Cl.none()
        ],
        deployer
      );

      expect(result).toBeOk(Cl.uint(1));
    });
  });

  describe("Market Resolution", () => {
    beforeEach(() => {
      // Register oracle in both contracts
      simnet.callPublicFn(
        "oracle-bridge",
        "register-oracle",
        [Cl.uint(1_000_000 * PRECISION)],
        wallet1
      );

      simnet.callPublicFn(
        "market-manager",
        "register-oracle",
        [Cl.uint(1_000_000_000)],
        wallet1
      );

      // Create binary market
      const currentBlock = simnet.blockHeight;
      simnet.callPublicFn(
        "market-manager",
        "create-binary-market",
        [
          Cl.stringAscii("Test market for resolution"),
          Cl.none(),
          Cl.uint(currentBlock + ONE_DAY), // resolution time
          Cl.uint(currentBlock + ONE_DAY - 10), // lock time (before resolution)
          Cl.principal(wallet1),
          Cl.uint(10 * PRECISION),
          Cl.stringAscii("crypto"),
          Cl.none()
        ],
        deployer
      );
    });

    it("should resolve market by oracle", () => {
      // Mine blocks to reach resolution time
      simnet.mineEmptyBlocks(ONE_DAY + 1);

      const { result } = simnet.callPublicFn(
        "market-manager",
        "resolve-market",
        [Cl.uint(1), Cl.uint(0)], // Market 1, outcome 0 (Yes)
        wallet1
      );

      expect(result).toBeOk(Cl.bool(true));
    });
  });

  describe("Main WagerWars Contract", () => {
    beforeEach(() => {
      // Register oracle in both contracts
      simnet.callPublicFn(
        "oracle-bridge",
        "register-oracle",
        [Cl.uint(1_000_000 * PRECISION)],
        wallet1
      );

      simnet.callPublicFn(
        "market-manager",
        "register-oracle",
        [Cl.uint(1_000_000_000)],
        wallet1
      );
    });

    it("should create binary prediction through main contract", () => {
      const currentBlock = simnet.blockHeight;
      const lockTime = currentBlock + ONE_DAY;
      const resolutionTime = lockTime + ONE_DAY;

      const { result } = simnet.callPublicFn(
        "wagerwars",
        "create-binary-prediction",
        [
          Cl.stringAscii("Will ETH reach $5000?"),
          Cl.uint(resolutionTime),
          Cl.uint(lockTime),
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

      // Check that the result is ok (contains version, markets, vault, oracles)
      expect(stats.result.type).toBe("ok");
    });
  });
});
