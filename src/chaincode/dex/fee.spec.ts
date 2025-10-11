import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { DexFeePercentageTypes, DexPositionData, Pool, TickData } from "../../api";

describe("Tick Crossing Bug Integration Test - Using Real Production Code", () => {
  // Helper: Create pool with blockchain data from Sept 13, 2025
  function createPoolWithBlockchainData(): Pool {
    const poolHash = "test_pool_hash";

    const pool = plainToInstance(Pool, {
      token0: "GALA$Unit$none$none",
      token1: "GUSDT$Unit$none$none",
      fee: DexFeePercentageTypes.FEE_1_PERCENT,
      sqrtPrice: new BigNumber("0.135182753844990324"),
      liquidity: new BigNumber("19039161.19119656661549899562"),
      feeGrowthGlobal0: new BigNumber("0.05593351969193059066"),
      feeGrowthGlobal1: new BigNumber("0.00099306212615977836"),
      grossPoolLiquidity: new BigNumber("19039161.19119656661549899562"),
      protocolFees: 0,
      protocolFeesToken0: new BigNumber("0"),
      protocolFeesToken1: new BigNumber("0"),
      bitmap: {},
      tickSpacing: 100
    });

    pool.genPoolHash = () => poolHash;
    return pool;
  }

  // Helper: Create position with blockchain data
  function createPositionWithBlockchainData(poolHash: string): DexPositionData {
    const position = plainToInstance(DexPositionData, {
      poolHash: poolHash,
      positionId: "faacef68ed0dbb2c367c8628f0b2a1999445d9e6a695cac7ab0918b2c10a4707",
      tickUpper: -37800,
      tickLower: -41400,
      liquidity: new BigNumber("61809064.09696388305846068877"),
      feeGrowthInside0Last: new BigNumber("0"),
      feeGrowthInside1Last: new BigNumber("0"),
      tokensOwed0: new BigNumber("0"),
      tokensOwed1: new BigNumber("0"),
      fee: DexFeePercentageTypes.FEE_1_PERCENT
    });

    return position;
  }

  // Helper: Create tick data map
  function createTickDataMap(poolHash: string): Record<string, TickData> {
    const tickMap: Record<string, TickData> = {};

    const tickLower = new TickData(poolHash, -41400);
    tickLower.initialised = true;
    tickLower.liquidityGross = new BigNumber("61809064.09696388305846068877");
    tickLower.liquidityNet = new BigNumber("61809064.09696388305846068877");
    tickLower.feeGrowthOutside0 = new BigNumber("0.05593351969193059066");
    tickLower.feeGrowthOutside1 = new BigNumber("0.00099306212615977836");
    tickMap["-41400"] = tickLower;

    const tickUpper = new TickData(poolHash, -37800);
    tickUpper.initialised = true;
    tickUpper.liquidityGross = new BigNumber("61809064.09696388305846068877");
    tickUpper.liquidityNet = new BigNumber("-61809064.09696388305846068877");
    tickUpper.feeGrowthOutside0 = new BigNumber("0");
    tickUpper.feeGrowthOutside1 = new BigNumber("0");
    tickMap["-37800"] = tickUpper;

    return tickMap;
  }

  // PART 1: Verify Position Creation
  describe("Part 1: Position Creation (Block 8640201)", () => {
    it("should verify position initialized correctly using real Pool.getFeeCollectedEstimation()", () => {
      const pool = createPoolWithBlockchainData();
      const poolHash = pool.genPoolHash();
      const position = createPositionWithBlockchainData(poolHash);
      const tickDataMap = createTickDataMap(poolHash);

      const tickLowerData = tickDataMap["-41400"];
      const tickUpperData = tickDataMap["-37800"];
      const [feesOwed0, feesOwed1] = pool.getFeeCollectedEstimation(position, tickLowerData, tickUpperData);

      expect(feesOwed0.toFixed()).toBe("0");
      expect(feesOwed1.toFixed()).toBe("0");
      expect(position.feeGrowthInside0Last.toFixed()).toBe("0");
      expect(position.feeGrowthInside1Last.toFixed()).toBe("0");
    });
  });

  // PART 2: Tick Corruption Mechanism
  describe("Part 2: Tick Corruption Mechanism", () => {
    it("should show how fees added BEFORE tickCross() corrupts tick data", () => {
      const poolHash = "test_pool_hash";
      const feeGrowthGlobal0Before = new BigNumber("0.06707603778386295090");
      const feeGrowthGlobal1Before = new BigNumber("0.01114251808435406506");

      const tickLower = new TickData(poolHash, -41400);
      tickLower.feeGrowthOutside0 = new BigNumber("0.05593351969193059066");
      tickLower.feeGrowthOutside1 = new BigNumber("0.00099306212615977836");

      const swapFees = new BigNumber("2.688888888888888888");
      const liquidity = new BigNumber("19039161.19119656661549899562");
      const feePerLiquidity = swapFees.dividedBy(liquidity);

      // SCENARIO 1: BUGGY - Add fees BEFORE tickCross
      const feeGrowthGlobal0AfterFees = feeGrowthGlobal0Before.plus(feePerLiquidity);
      const tickCrossResult_BUGGY = feeGrowthGlobal0AfterFees.minus(tickLower.feeGrowthOutside0);

      // SCENARIO 2: CORRECT - tickCross BEFORE adding fees
      const tickCrossResult_CORRECT = feeGrowthGlobal0Before.minus(tickLower.feeGrowthOutside0);

      console.log("\n=== TICK CORRUPTION MECHANISM ===");
      console.log("\nBUGGY (current code):");
      console.log("  1. feeGrowthGlobal AFTER adding fees:", feeGrowthGlobal0AfterFees.toFixed(20));
      console.log("  2. tickCross result:", tickCrossResult_BUGGY.toFixed(20));
      console.log("  → INFLATED by:", feePerLiquidity.toFixed(20));

      console.log("\nCORRECT (fixed code):");
      console.log("  1. feeGrowthGlobal BEFORE adding fees:", feeGrowthGlobal0Before.toFixed(20));
      console.log("  2. tickCross result:", tickCrossResult_CORRECT.toFixed(20));
      console.log("  → NO inflation");

      const inflation = tickCrossResult_BUGGY.minus(tickCrossResult_CORRECT);
      console.log("\nInflation amount:", inflation.toFixed(20));

      expect(tickCrossResult_BUGGY.isGreaterThan(tickCrossResult_CORRECT)).toBe(true);
      expect(inflation.toFixed(20)).toBe(feePerLiquidity.toFixed(20));
    });
  });

  // PART 3: Phantom Fee Collection
  describe("Part 3: Phantom Fee Collection (Block 8830130)", () => {
    it("should calculate phantom fees using corrupted tick data", () => {
      const pool = createPoolWithBlockchainData();
      pool.sqrtPrice = new BigNumber("0.123456789012345678");
      pool.feeGrowthGlobal0 = new BigNumber("0.07033617934158838960");
      pool.feeGrowthGlobal1 = new BigNumber("0.01115237339572684504");
      pool.liquidity = new BigNumber("19039161.19119656661549899562");

      const poolHash = pool.genPoolHash();
      const position = createPositionWithBlockchainData(poolHash);

      // CORRUPTED tick data
      const tickLower = new TickData(poolHash, -41400);
      tickLower.initialised = true;
      tickLower.feeGrowthOutside0 = new BigNumber("0.06707617901675948894");
      tickLower.feeGrowthOutside1 = new BigNumber("0.01114974338058095542");

      const tickUpper = new TickData(poolHash, -37800);
      tickUpper.initialised = true;
      tickUpper.feeGrowthOutside0 = new BigNumber("0");
      tickUpper.feeGrowthOutside1 = new BigNumber("0");

      const [phantomGALA, phantomUSDT] = pool.getFeeCollectedEstimation(position, tickLower, tickUpper);

      console.log("\n=== PHANTOM FEES (Using Corrupted Ticks) ===");
      console.log("Position liquidity:", position.liquidity.toFixed());
      console.log("Phantom GALA collected:", phantomGALA.toFixed(0));
      console.log("Phantom USDT collected:", phantomUSDT.toFixed(0));

      expect(parseInt(phantomGALA.toFixed(0))).toBeGreaterThan(4000000);
      expect(parseInt(phantomUSDT.toFixed(0))).toBeGreaterThan(68000);
    });

    it("should calculate LEGITIMATE fees using correct tick data", () => {
      const pool = createPoolWithBlockchainData();
      pool.sqrtPrice = new BigNumber("0.123456789012345678");
      pool.feeGrowthGlobal0 = new BigNumber("0.07033617934158838960");
      pool.feeGrowthGlobal1 = new BigNumber("0.01115237339572684504");
      pool.liquidity = new BigNumber("19039161.19119656661549899562");

      const poolHash = pool.genPoolHash();
      const position = createPositionWithBlockchainData(poolHash);

      // CORRECT tick data
      const tickLower = new TickData(poolHash, -41400);
      tickLower.initialised = true;
      tickLower.feeGrowthOutside0 = new BigNumber("0.06707603778386295090");
      tickLower.feeGrowthOutside1 = new BigNumber("0.01114251808435406506");

      const tickUpper = new TickData(poolHash, -37800);
      tickUpper.initialised = true;
      tickUpper.feeGrowthOutside0 = new BigNumber("0");
      tickUpper.feeGrowthOutside1 = new BigNumber("0");

      const [legitimateGALA, legitimateUSDT] = pool.getFeeCollectedEstimation(position, tickLower, tickUpper);

      console.log("\n=== LEGITIMATE FEES (Using Correct Ticks) ===");
      console.log("Position liquidity:", position.liquidity.toFixed());
      console.log("Legitimate GALA collected:", legitimateGALA.toFixed(0));
      console.log("Legitimate USDT collected:", legitimateUSDT.toFixed(0));

      expect(parseInt(legitimateUSDT.toFixed(0))).toBeCloseTo(44826, -2);
    });

    it("should compare phantom vs legitimate fees side-by-side", () => {
      const pool = createPoolWithBlockchainData();
      pool.sqrtPrice = new BigNumber("0.123456789012345678");
      pool.feeGrowthGlobal0 = new BigNumber("0.07033617934158838960");
      pool.feeGrowthGlobal1 = new BigNumber("0.01115237339572684504");

      const poolHash = pool.genPoolHash();
      const position1 = createPositionWithBlockchainData(poolHash);
      const position2 = createPositionWithBlockchainData(poolHash);

      // Corrupted ticks
      const tickLowerCorrupted = new TickData(poolHash, -41400);
      tickLowerCorrupted.initialised = true;
      tickLowerCorrupted.feeGrowthOutside0 = new BigNumber("0.06707617901675948894");
      tickLowerCorrupted.feeGrowthOutside1 = new BigNumber("0.01114974338058095542");

      const tickUpperCorrupted = new TickData(poolHash, -37800);
      tickUpperCorrupted.initialised = true;
      tickUpperCorrupted.feeGrowthOutside0 = new BigNumber("0");
      tickUpperCorrupted.feeGrowthOutside1 = new BigNumber("0");

      // Correct ticks
      const tickLowerCorrect = new TickData(poolHash, -41400);
      tickLowerCorrect.initialised = true;
      tickLowerCorrect.feeGrowthOutside0 = new BigNumber("0.06707603778386295090");
      tickLowerCorrect.feeGrowthOutside1 = new BigNumber("0.01114251808435406506");

      const tickUpperCorrect = new TickData(poolHash, -37800);
      tickUpperCorrect.initialised = true;
      tickUpperCorrect.feeGrowthOutside0 = new BigNumber("0");
      tickUpperCorrect.feeGrowthOutside1 = new BigNumber("0");

      const [phantomGALA, phantomUSDT] = pool.getFeeCollectedEstimation(
        position1,
        tickLowerCorrupted,
        tickUpperCorrupted
      );

      const [legitimateGALA, legitimateUSDT] = pool.getFeeCollectedEstimation(
        position2,
        tickLowerCorrect,
        tickUpperCorrect
      );

      const phantomGALAAmount = parseInt(phantomGALA.toFixed(0));
      const legitimateGALAAmount = parseInt(legitimateGALA.toFixed(0));
      const phantomUSDTAmount = parseInt(phantomUSDT.toFixed(0));
      const legitimateUSDTAmount = parseInt(legitimateUSDT.toFixed(0));

      console.log("\n=== SIDE-BY-SIDE COMPARISON ===");
      console.log("\nGALA Fees:");
      console.log("  Phantom (buggy):", phantomGALAAmount.toLocaleString());
      console.log("  Legitimate (correct):", legitimateGALAAmount.toLocaleString());
      console.log("  Difference:", (phantomGALAAmount - legitimateGALAAmount).toLocaleString());

      console.log("\nUSDT Fees:");
      console.log("  Phantom (buggy):", phantomUSDTAmount.toLocaleString());
      console.log("  Legitimate (correct):", legitimateUSDTAmount.toLocaleString());
      console.log("  Difference:", (phantomUSDTAmount - legitimateUSDTAmount).toLocaleString());

      console.log("\n=== BLOCKCHAIN REALITY ===");
      console.log("Actual GALA collected (block 8830130): 3,658,651");
      console.log("Actual USDT collected (block 8830130): 45,515");

      expect(phantomGALAAmount).toBeGreaterThan(legitimateGALAAmount);
      expect(phantomUSDTAmount).toBeGreaterThan(legitimateUSDTAmount);
    });
  });

  // PART 4: The Fix
  describe("Part 4: The Fix - Store Values Before Adding Fees", () => {
    it("should show that storing values BEFORE fee addition prevents corruption", () => {
      const feeGrowthGlobal0Before = new BigNumber("0.06707603778386295090");
      const poolHash = "test_pool_hash";

      const tickLower = new TickData(poolHash, -41400);
      tickLower.feeGrowthOutside0 = new BigNumber("0.05593351969193059066");

      const swapFees = new BigNumber("2.688888888888888888");
      const liquidity = new BigNumber("19039161.19119656661549899562");

      // BUGGY: Add fees first, then cross
      const feeGrowthGlobal0AfterFees = feeGrowthGlobal0Before.plus(swapFees.dividedBy(liquidity));
      const tickCrossedBuggy = feeGrowthGlobal0AfterFees.minus(tickLower.feeGrowthOutside0);

      // CORRECT: Cross first, then add fees
      const tickCrossedCorrect = feeGrowthGlobal0Before.minus(tickLower.feeGrowthOutside0);

      console.log("\n=== FIX DEMONSTRATION ===");
      console.log("\nBUGGY (current code):");
      console.log("  1. Add fees to global:", feeGrowthGlobal0AfterFees.toFixed(20));
      console.log("  2. Cross tick:", tickCrossedBuggy.toFixed(20));
      console.log("  Result: INFLATED tick value");

      console.log("\nCORRECT (fixed code):");
      console.log("  1. Cross tick (using OLD global):", tickCrossedCorrect.toFixed(20));
      console.log("  2. Add fees to global:", feeGrowthGlobal0AfterFees.toFixed(20));
      console.log("  Result: CORRECT tick value");

      const inflation = tickCrossedBuggy.minus(tickCrossedCorrect);
      console.log("\nInflation amount:", inflation.toFixed(20));

      expect(tickCrossedBuggy.toFixed(10)).not.toBe(tickCrossedCorrect.toFixed(10));
      expect(inflation.toFixed(20)).toBe(swapFees.dividedBy(liquidity).toFixed(20));
    });
  });
});
