/*
 * Copyright (c) Gala Games Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  GalaChainResponse,
  GalaChainResponseType,
  TokenBalance,
  TokenClass,
  TokenClassKey,
  TokenInstance,
  ValidationFailedError
} from "@gala-chain/api";
import { fixture, transactionSuccess, users } from "@gala-chain/test";
import { currency } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";
import { randomUUID } from "crypto";

import {
  DexOperationResDto,
  Pool,
  SlippageToleranceExceededError,
  UserBalanceResDto,
  feeAmountTickSpacing,
  sqrtPriceToTick,
  tickToSqrtPrice
} from "../../api";
import { AddLiquidityDTO, DexFeePercentageTypes } from "../../api";
import dex from "../test/dex";
import { DexV3Contract } from "./../DexV3Contract";
import { addLiquidity } from "./addLiquidity";

describe("Add Liquidity", () => {
  const currencyInstance: TokenInstance = currency.tokenInstance();
  const currencyClass: TokenClass = currency.tokenClass();
  const currencyClassKey: TokenClassKey = currency.tokenClassKey();

  const dexInstance: TokenInstance = dex.tokenInstance();
  const dexClass: TokenClass = dex.tokenClass();
  const dexClassKey: TokenClassKey = dex.tokenClassKey();

  let dexUserBalance: TokenBalance;
  let currencyUserBalance: TokenBalance;
  const fee = DexFeePercentageTypes.FEE_0_05_PERCENT;

  let pool: Pool;

  beforeEach(() => {
    //Given
    pool = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      fee,
      new BigNumber("0.13167161045570909246241168862")
    );

    currencyUserBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1.identityKey
    });

    dexUserBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1.identityKey
    });
  });

  it("Should use launchpad address if provided", async () => {
    //Given
    const [ta, tb] = spacedTicksFromPrice(1700, 1900, feeAmountTickSpacing[fee]);

    const currencyLaunchpadBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser2.identityKey
    });

    const dexLaunchpadBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser2.identityKey
    });

    const token0 = new BigNumber("1");
    const token1 = new BigNumber("1");
    const [token0Min, token1Min] = [new BigNumber("0"), new BigNumber("0.995")];

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Min,
      token1Min,
      undefined
    );
    dto.uniqueKey = randomUUID();
    dto.sign(users.testUser1.privateKey);

    const launchpadAlias = users.testUser2.identityKey;

    //When
    const { ctx } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1, users.testUser2)
      .callingUser(users.testUser2)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        currencyLaunchpadBalance,
        dexLaunchpadBalance
      );

    const res = await addLiquidity(ctx, dto, launchpadAlias);

    const expectedResponse = plainToInstance(DexOperationResDto, {
      userBalanceDelta: plainToInstance(UserBalanceResDto, {
        token0Balance: {
          owner: users.testUser2.identityKey,
          collection: "TEST",
          category: "Currency",
          type: "DEX",
          additionalKey: "client:6337024724eec8c292f0118d",
          quantity: new BigNumber("1000"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        },
        token1Balance: {
          owner: users.testUser2.identityKey,
          collection: "TEST",
          category: "Currency",
          type: "TEST",
          additionalKey: "none",
          quantity: new BigNumber("999.0000000001"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        }
      }),
      amounts: ["0", "0.9999999999"],
      poolHash: pool.genPoolHash(),
      poolAlias: pool.getPoolAlias(),
      poolFee: 500,
      userAddress: users.testUser2.identityKey
    });

    expect(res).toEqual(expectedResponse);
  });

  it("Should throw error while adding liquidity below minimum tick", async () => {
    //Given
    const tickLower = -887280,
      tickUpper = -324340;

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      tickLower,
      tickUpper,
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      undefined
    );
    dto.uniqueKey = randomUUID();

    dto.sign(users.testUser1.privateKey);

    const { ctx, contract } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(dexClass, currencyClass, dexInstance, currencyInstance, pool);

    //When
    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

    //Then
    expect(addLiquidityRes).toEqual({
      Status: GalaChainResponseType.Error,
      ErrorCode: 400,
      ErrorKey: "DTO_VALIDATION_FAILED",
      ErrorPayload: ["min: tickLower must not be less than -887272"],
      Message: "DTO validation failed: (1) min: tickLower must not be less than -887272"
    });
  });

  it("Should throw error while adding liquidity above maximum tick", async () => {
    //Given

    const tickLower = 76110;
    const tickUpper = 887350;

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      tickLower,
      tickUpper,
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      undefined
    );
    dto.uniqueKey = randomUUID();

    dto.sign(users.testUser1.privateKey);

    const { ctx, contract } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

    expect(addLiquidityRes).toEqual({
      Status: GalaChainResponseType.Error,
      ErrorCode: 400,
      ErrorKey: "DTO_VALIDATION_FAILED",
      ErrorPayload: ["max: tickUpper must not be greater than 887272"],
      Message: "DTO validation failed: (1) max: tickUpper must not be greater than 887272"
    });
  });

  it("Should throw error if tick lower is greater than upper tick", async () => {
    //Given
    const tickLower = 887280;
    const tickUpper = -324340;

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      tickLower,
      tickUpper,
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      undefined
    );
    dto.uniqueKey = randomUUID();

    dto.sign(users.testUser1.privateKey);

    const { ctx, contract } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    //When
    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

    //Then
    expect(addLiquidityRes).toEqual({
      Status: GalaChainResponseType.Error,
      ErrorCode: 400,
      ErrorKey: "DTO_VALIDATION_FAILED",
      ErrorPayload: ["isLessThan: tickLower must be less than tickUpper"],
      Message: "DTO validation failed: (1) isLessThan: tickLower must be less than tickUpper"
    });
  });

  it("Should throw error when ticks are not spaced", async () => {
    //Given
    const tickLower = 887;
    const tickUpper = 32434;

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      tickLower,
      tickUpper,
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      undefined
    );
    dto.uniqueKey = randomUUID();

    dto.sign(users.testUser1.privateKey);

    pool.maxLiquidityPerTick = new BigNumber("19200");

    const { ctx, contract, getWrites } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    const writes = getWrites();

    //When
    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

    //Then
    expect(addLiquidityRes).toEqual(
      GalaChainResponse.Error(new ValidationFailedError("Tick is not spaced 887 10"))
    );

    expect(writes).toEqual({});
  });

  test("Should throw error while adding liquidity more than max liquidity ", async () => {
    //Given
    const pa = 1700,
      pb = 1900;
    const fee = 500;
    const tickSpacing = feeAmountTickSpacing[fee];
    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);
    const slippage = 0.5;
    const token0 = new BigNumber("10"),
      token1 = new BigNumber("10000000000000000000000000000000000000000000");
    const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Slipped,
      token1Slipped,
      undefined
    );
    dto.uniqueKey = randomUUID();

    dto.sign(users.testUser1.privateKey);

    const { ctx, contract } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    //When
    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

    //Then
    expect(addLiquidityRes).toEqual(
      GalaChainResponse.Error(new ValidationFailedError("liquidity crossed max liquidity"))
    );
  });

  it("Should throw error while adding liquidity equal to zero", async () => {
    //Given
    const pa = 1700,
      pb = 1900;
    const fee = 500;
    const tickSpacing = feeAmountTickSpacing[fee];

    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);
    const slippage = 0.5;
    const token0 = new BigNumber("0"),
      token1 = new BigNumber("0");
    const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Slipped,
      token1Slipped,
      undefined
    );
    dto.uniqueKey = randomUUID();

    dto.sign(users.testUser1.privateKey);

    const { ctx, contract } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    //When
    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

    //Then
    expect(addLiquidityRes).toEqual(GalaChainResponse.Error(new ValidationFailedError("Invalid Liquidity")));
  });

  it("Should add liquidity in range 1700 - 1900", async () => {
    console.log("tick value1", tickToSqrtPrice(-37010).toString());
    console.log("tick value2", tickToSqrtPrice(-42810).toString());
    pool.bitmap = { "-14": "696898287454081973172991196020261297061888", "-16": "2361183241434822606848" };

    pool.liquidity = new BigNumber("948553.304475454395466072");
    //Given
    const tickSpacing = feeAmountTickSpacing[fee];

    const pa = 1700,
      pb = 1900;

    // pool.maxLiquidityPerTick = new BigNumber("1917565579412846627735051215301243.08110657663841167978");

    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);

    const slippage = 0.5;

    const userDexBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalance(),
      owner: users.testUser1.identityKey,
      quantity: new BigNumber("1000000") // User has 10k DEX tokens
    });
    const userCurrencyBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalance(),
      owner: users.testUser1.identityKey,
      quantity: new BigNumber("1000000") // User has 10k CURRENCY tokens
    });

    const { ctx, contract } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        userDexBalance,
        userCurrencyBalance
      );

    // const AmountForLiquidity = pool.getAmountForLiquidity(new BigNumber("1"), ta, tb, false);

    // const token0 = new BigNumber(AmountForLiquidity[0]);
    // const token1 = new BigNumber(AmountForLiquidity[1]);

    // const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      -886800,
      886800,
      new BigNumber("380881"),
      new BigNumber("6603.4912"),
      new BigNumber("378976.59499999997206032276"),
      new BigNumber("6570.47374400000080640893"),
      undefined
    );
    dto.uniqueKey = randomUUID();

    dto.sign(users.testUser1.privateKey);

    //When
    const res = await contract.AddLiquidity(ctx, dto);
    console.dir(res, { depth: null, colors: true });

    const expectedResponse = plainToInstance(DexOperationResDto, {
      userBalanceDelta: plainToInstance(UserBalanceResDto, {
        token0Balance: {
          owner: users.testUser1.identityKey,
          collection: "TEST",
          category: "Currency",
          type: "DEX",
          additionalKey: "client:6337024724eec8c292f0118d",
          quantity: new BigNumber("1000"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        },
        token1Balance: {
          owner: users.testUser1.identityKey,
          collection: "TEST",
          category: "Currency",
          type: "TEST",
          additionalKey: "none",
          quantity: new BigNumber("999.0000000001"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        }
      }),
      amounts: ["0", "0.9999999999"],
      poolHash: pool.genPoolHash(),
      poolAlias: pool.getPoolAlias(),
      poolFee: 500,
      userAddress: users.testUser1.identityKey
    });

    //Then
    expect(res).toEqual(transactionSuccess(expectedResponse));
  });

  it("Should add liquidity in range 1700 - 1900", async () => {
    // console.log("tick value1", tickToSqrtPrice(-37010).toString());
    // console.log("tick value2", tickToSqrtPrice(-42810).toString());
    pool.bitmap = {
      "-14": "696898287454081973172991196020261297061888",
      "-15": "0",
      "-16": "105312291668557186697918027683670432318895097761732352689133584384",
      "-346": "5708990770823839524233143877797980545530986496",
      "346": "20282409603651670423947251286016",
      "4": "18889465931478580854784"
    };
    pool.sqrtPrice = new BigNumber("0.1319480852078966165");
    pool.liquidity = new BigNumber("1127395.673785864344442455");
    //Given
    const tickSpacing = feeAmountTickSpacing[fee];

    const pa = 1700,
      pb = 1900;

    // pool.maxLiquidityPerTick = new BigNumber("1917565579412846627735051215301243.08110657663841167978");

    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);

    const slippage = 0.5;

    const userDexBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalance(),
      owner: users.testUser1.identityKey,
      quantity: new BigNumber("10000000") // User has 10k DEX tokens
    });
    const userCurrencyBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalance(),
      owner: users.testUser1.identityKey,
      quantity: new BigNumber("10000000") // User has 10k CURRENCY tokens
    });

    const { ctx, contract } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        userDexBalance,
        userCurrencyBalance
      );

    // const AmountForLiquidity = pool.getAmountForLiquidity(new BigNumber("1"), ta, tb, false);

    // const token0 = new BigNumber(AmountForLiquidity[0]);
    // const token1 = new BigNumber(AmountForLiquidity[1]);

    // const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      -41360,
      10980,
      new BigNumber("2000000"),
      new BigNumber("1570.190686"),
      new BigNumber("1800000"),
      new BigNumber("1413.17161740000005920592"),
      undefined
    );
    dto.uniqueKey = randomUUID();

    dto.sign(users.testUser1.privateKey);

    //When
    const res = await contract.AddLiquidity(ctx, dto);
    console.dir(res, { depth: null, colors: true });

    const expectedResponse = plainToInstance(DexOperationResDto, {
      userBalanceDelta: plainToInstance(UserBalanceResDto, {
        token0Balance: {
          owner: users.testUser1.identityKey,
          collection: "TEST",
          category: "Currency",
          type: "DEX",
          additionalKey: "client:6337024724eec8c292f0118d",
          quantity: new BigNumber("1000"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        },
        token1Balance: {
          owner: users.testUser1.identityKey,
          collection: "TEST",
          category: "Currency",
          type: "TEST",
          additionalKey: "none",
          quantity: new BigNumber("999.0000000001"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        }
      }),
      amounts: ["0", "0.9999999999"],
      poolHash: pool.genPoolHash(),
      poolAlias: pool.getPoolAlias(),
      poolFee: 500,
      userAddress: users.testUser1.identityKey
    });

    //Then
    expect(res).toEqual(transactionSuccess(expectedResponse));
  });

  it.only("Should add liquidity in range 1700 - 1900", async () => {
    console.log("tick value1", tickToSqrtPrice(-37010).toString());
    console.log("tick value2", tickToSqrtPrice(-42810).toString());
    pool.bitmap = {
      "-14": "696898287454081973172991196020261297061888",
      "-15": "0",
      "-16": "105312291668557186697918027683670432318895097761732352689133584384",
      "-346": "5708990770823839524233143877797980545530986496",
      "346": "20282409603651670423947251286016",
      "4": "18889465931478580854784"
    };
    pool.sqrtPrice = new BigNumber("0.126452366278047678704865575128");
    pool.liquidity = new BigNumber("1413061.178069886129800058");
    //Given
    const tickSpacing = feeAmountTickSpacing[fee];

    const pa = 1700,
      pb = 1900;

    // pool.maxLiquidityPerTick = new BigNumber("1917565579412846627735051215301243.08110657663841167978");

    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);

    const slippage = 0.5;

    const userDexBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalance(),
      owner: users.testUser1.identityKey,
      quantity: new BigNumber("10000000") // User has 10k DEX tokens
    });
    const userCurrencyBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalance(),
      owner: users.testUser1.identityKey,
      quantity: new BigNumber("10000000") // User has 10k CURRENCY tokens
    });

    const { ctx, contract } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        userDexBalance,
        userCurrencyBalance
      );

    // const AmountForLiquidity = pool.getAmountForLiquidity(new BigNumber("1"), ta, tb, false);

    // const token0 = new BigNumber(AmountForLiquidity[0]);
    // const token1 = new BigNumber(AmountForLiquidity[1]);

    // const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      -886800,
      886800,
      new BigNumber("1"),
      new BigNumber("0.01599"),
      new BigNumber("0.99499999999999999556"),
      new BigNumber("0.01591005000000000197"),
      undefined
    );
    dto.uniqueKey = randomUUID();

    dto.sign(users.testUser1.privateKey);

    //When
    const res = await contract.AddLiquidity(ctx, dto);
    console.dir(res, { depth: null, colors: true });

    const expectedResponse = plainToInstance(DexOperationResDto, {
      userBalanceDelta: plainToInstance(UserBalanceResDto, {
        token0Balance: {
          owner: users.testUser1.identityKey,
          collection: "TEST",
          category: "Currency",
          type: "DEX",
          additionalKey: "client:6337024724eec8c292f0118d",
          quantity: new BigNumber("1000"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        },
        token1Balance: {
          owner: users.testUser1.identityKey,
          collection: "TEST",
          category: "Currency",
          type: "TEST",
          additionalKey: "none",
          quantity: new BigNumber("999.0000000001"),
          instanceIds: [],
          inUseHolds: [],
          lockedHolds: []
        }
      }),
      amounts: ["0", "0.9999999999"],
      poolHash: pool.genPoolHash(),
      poolAlias: pool.getPoolAlias(),
      poolFee: 500,
      userAddress: users.testUser1.identityKey
    });

    //Then
    expect(res).toEqual(transactionSuccess(expectedResponse));
  });

  it("Should throw errow when slippage tolerance exceeds", async () => {
    //Given
    const tickSpacing = feeAmountTickSpacing[fee];

    const pa = 1700,
      pb = 1900;

    pool.maxLiquidityPerTick = new BigNumber("1917565579412846627735051215301243.08110657663841167978");

    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);

    const slippage = 0.5;

    const { ctx, contract } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    const AmountForLiquidity = pool.getAmountForLiquidity(new BigNumber("1"), ta, tb, false);

    const token0 = new BigNumber(AmountForLiquidity[0]);
    const token1 = new BigNumber(AmountForLiquidity[1]);

    const [token0Slipped] = slippedValue([token0, token1], slippage);

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Slipped,
      new BigNumber("1.2"),
      undefined
    );
    dto.uniqueKey = randomUUID();

    dto.sign(users.testUser1.privateKey);

    //When
    const res = await contract.AddLiquidity(ctx, dto);

    //Then
    expect(res).toEqual(
      GalaChainResponse.Error(
        new SlippageToleranceExceededError(
          "Slippage tolerance exceeded: expected minimums (amount0 ≥ 0, amount1 ≥ 1.2), but received (amount0 = 0, amount1 = 0.9999999999999999987507130119332)"
        )
      )
    );
  });

  it("Should throw slippage tolerance exceeds error if amout1min is greater than received amount", async () => {
    //Given
    const tickSpacing = feeAmountTickSpacing[fee];

    const pa = 1700,
      pb = 1900;

    pool.maxLiquidityPerTick = new BigNumber("1917565579412846627735051215301243.08110657663841167978");

    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);

    const slippage = 0.5;

    const { ctx, contract } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    const AmountForLiquidity = pool.getAmountForLiquidity(new BigNumber("1"), ta, tb, false);

    const token0 = new BigNumber(AmountForLiquidity[0]);
    const token1 = new BigNumber(AmountForLiquidity[1]);

    const [token0Slipped] = slippedValue([token0, token1], slippage);

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Slipped,
      new BigNumber("1.2"),
      undefined
    );
    dto.uniqueKey = randomUUID();

    dto.sign(users.testUser1.privateKey);

    //When
    const res = await contract.AddLiquidity(ctx, dto);

    //Then
    expect(res).toEqual(
      GalaChainResponse.Error(
        new SlippageToleranceExceededError(
          "Slippage tolerance exceeded: expected minimums (amount0 ≥ 0, amount1 ≥ 1.2), but received (amount0 = 0, amount1 = 0.9999999999999999987507130119332)"
        )
      )
    );
  });

  it("Should throw slippage tolerance exceeds error if amout0min is greater than received amount", async () => {
    //Given
    const tickSpacing = feeAmountTickSpacing[fee];

    const pa = 1700,
      pb = 1900;

    pool.maxLiquidityPerTick = new BigNumber("1917565579412846627735051215301243.08110657663841167978");

    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);

    const slippage = 0.5;

    const { ctx, contract } = fixture(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    const AmountForLiquidity = pool.getAmountForLiquidity(new BigNumber("1"), ta, tb, false);

    const token0 = new BigNumber(AmountForLiquidity[0]);
    const token1 = new BigNumber(AmountForLiquidity[1]);

    const [token0Slipped] = slippedValue([token0, token1], slippage);

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Slipped,
      new BigNumber("1.2"),
      undefined
    );
    dto.uniqueKey = randomUUID();

    dto.sign(users.testUser1.privateKey);

    //When
    const res = await contract.AddLiquidity(ctx, dto);

    //Then
    expect(res).toEqual(
      GalaChainResponse.Error(
        new SlippageToleranceExceededError(
          "Slippage tolerance exceeded: expected minimums (amount0 ≥ 0, amount1 ≥ 1.2), but received (amount0 = 0, amount1 = 0.9999999999999999987507130119332)"
        )
      )
    );
  });
});

const spacedTicksFromPrice = (pa: number, pb: number, tickSpacing: number) => {
  return [
    Math.ceil(sqrtPriceToTick(new BigNumber(Math.sqrt(pa))) / tickSpacing) * tickSpacing,
    Math.floor(sqrtPriceToTick(new BigNumber(Math.sqrt(pb))) / tickSpacing) * tickSpacing
  ];
};

function slippedValue(val: BigNumber[], slippage: BigNumber | number) {
  if (typeof slippage === "number" || typeof slippage === "string") {
    slippage = new BigNumber(slippage);
  }
  const hundred = new BigNumber(100);
  return val.map((e) => e.multipliedBy(hundred.minus(slippage)).dividedBy(hundred));
}
