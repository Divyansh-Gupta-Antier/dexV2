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
  FeeThresholdUses,
  GalaChainResponse,
  TokenBalance,
  TokenClass,
  TokenClassKey,
  TokenInstance,
  asValidUserAlias,
  randomUniqueKey
} from "@gala-chain/api";
import { GalaChainContext } from "@gala-chain/chaincode";
import { currency, fixture, users, writesMap } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";
import { randomUUID } from "crypto";

import {
  AddLiquidityDTO,
  BurnDto,
  CollectDto,
  CreatePoolDto,
  CreatePoolResDto,
  DexFeeConfig,
  DexFeePercentageTypes,
  GetPositionDto,
  Pool,
  SwapDto
} from "../../api/";
import { DexV3Contract } from "../DexV3Contract";
import dex from "../test/dex";
import dexTestUtils from "../test/dex";
import { generateKeyFromClassKey } from "./dexUtils";

describe("createPool", () => {
  it("should create a new liquidity pool and save it on-chain", async () => {
    const currencyInstance: TokenInstance = currency.tokenInstance();
    const currencyClass: TokenClass = currency.tokenClass();
    const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    const currencyBalance: TokenBalance = currency.tokenBalance();

    const dexInstance: TokenInstance = dexTestUtils.tokenInstance();
    const dexClass: TokenClass = dexTestUtils.tokenClass();
    const dexClassKey: TokenClassKey = dexTestUtils.tokenClassKey();
    const dexBalance: TokenBalance = dexTestUtils.tokenBalance();

    const dexFeeConfig: DexFeeConfig = new DexFeeConfig([asValidUserAlias(users.admin.identityKey)], 0.1);

    const { ctx, contract } = fixture<GalaChainContext, DexV3Contract>(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        currencyInstance,
        currencyClass,
        currencyBalance,
        dexFeeConfig,
        dexInstance,
        dexClass,
        dexBalance
      )
      .savedRangeState([]);

    const dto = new CreatePoolDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      new BigNumber("1")
    );
    dto.uniqueKey = "test";
    dto.sign(users.testUser1.privateKey);

    const [token0, token1] = [dto.token0, dto.token1].map(generateKeyFromClassKey);
    const expectedPool = new Pool(token0, token1, dto.token0, dto.token1, dto.fee, dto.initialSqrtPrice, 0.1);

    const expectedResponse = new CreatePoolResDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      expectedPool.genPoolHash(),
      expectedPool.getPoolAlias()
    );

    // When
    const response = await contract.CreatePool(ctx, dto);

    // Then
    expect(response).toEqual(GalaChainResponse.Success(expectedResponse));
  });

  it.only("should create a new liquidity pool using a configured protocol fee", async () => {
    // const token0Properties = {
    //   collection: "GALA",
    //   category: "Unit",
    //   type: "none",
    //   additionalKey: "none",
    //   decimals: 8
    // };
    // const token1Properties = {
    //   collection: "Token",
    //   category: "Unit",
    //   type: "TENDEXT",
    //   additionalKey: "client:6337024724eec8c292f0118d",
    //   decimals: 8
    // };
    // const currencyInstance: TokenInstance = currency.tokenInstance();
    // const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    // const currencyClass: TokenClass = currency.tokenClass();

    // const dexInstance: TokenInstance = dex.tokenInstance();
    // const dexClassKey: TokenClassKey = dex.tokenClassKey();
    // const dexClass: TokenClass = dex.tokenClass();
    const currencyInstance: TokenInstance = currency.tokenInstance();
    const currencyClass: TokenClass = currency.tokenClass();
    const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    const currencyBalance: TokenBalance = currency.tokenBalance();

    const dexInstance: TokenInstance = dexTestUtils.tokenInstance();
    const dexClass: TokenClass = dexTestUtils.tokenClass();
    const dexClassKey: TokenClassKey = dexTestUtils.tokenClassKey();
    const dexBalance: TokenBalance = dexTestUtils.tokenBalance();

    currencyBalance.addQuantity(new BigNumber("10000000000000000"));
    dexBalance.addQuantity(new BigNumber("10000000000000000"));

    const dexFeeConfig: DexFeeConfig = new DexFeeConfig([users.admin.identityKey], 0.1);

    const { ctx, contract, getWrites } = fixture<GalaChainContext, DexV3Contract>(DexV3Contract)
      .registeredUsers(users.testUser1)
      .savedState(
        currencyInstance,
        currencyClass,
        currencyBalance,
        dexFeeConfig,
        dexInstance,
        dexClass,
        dexBalance
      )
      .savedRangeState([]);

    const dto = new CreatePoolDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      new BigNumber("0.14958282796912410314")
    );
    dto.uniqueKey = "test";
    dto.sign(users.testUser1.privateKey);

    const expectedFeeThresholdUses = plainToInstance(FeeThresholdUses, {
      feeCode: "CreatePool",
      user: users.testUser1.identityKey,
      cumulativeUses: new BigNumber("1"),
      cumulativeFeeQuantity: new BigNumber("0")
    });

    const expectedPool = new Pool(
      currencyClassKey.toStringKey(),
      dexClassKey.toStringKey(),
      currencyClassKey,
      dexClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      new BigNumber("1"),
      dexFeeConfig.protocolFee
    );

    const expectedResponse = new CreatePoolResDto(
      currencyClassKey,
      dexClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      expectedPool.genPoolHash(),
      expectedPool.getPoolAlias()
    );

    // When
    const response = await contract.CreatePool(ctx, dto);

    const addLiquidityDTO = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      -41000,
      -35000,
      new BigNumber(5000000),
      new BigNumber(5000000),
      new BigNumber(0),
      new BigNumber(0),
      undefined
    );

    addLiquidityDTO.uniqueKey = "test1";
    addLiquidityDTO.sign(users.testUser1.privateKey);

    const response1 = await contract.AddLiquidity(ctx, addLiquidityDTO);
    console.dir(response1, { depth: null, colors: true });

    const addLiquidityDTO1 = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      -38000,
      -32000,
      new BigNumber(5000000),
      new BigNumber(5000000),
      new BigNumber(0),
      new BigNumber(0),
      undefined
    );

    addLiquidityDTO1.uniqueKey = "test12";
    addLiquidityDTO1.sign(users.testUser1.privateKey);

    const response2 = await contract.AddLiquidity(ctx, addLiquidityDTO1);
    console.dir(response2, { depth: null, colors: true });

    for (let index = 0; index < 16; index++) {
      const swapDto = new SwapDto(
        dexClassKey,
        currencyClassKey,
        DexFeePercentageTypes.FEE_1_PERCENT,
        new BigNumber("10000000"),
        true, // zeroForOne - swapping token0 (DEX) for token1 (CURRENCY)
        new BigNumber("0.128748098711992916"),
        new BigNumber("10000000000000000000"),
        new BigNumber("-0.00000000000000000001")
      );

      swapDto.uniqueKey = randomUniqueKey();
      const signedDto = swapDto.signed(users.testUser1.privateKey);
      const swapResponse = await contract.Swap(ctx, signedDto);
      console.dir(swapResponse, { depth: null, colors: true });

      const swapDto1 = new SwapDto(
        dexClassKey,
        currencyClassKey,
        DexFeePercentageTypes.FEE_1_PERCENT,
        new BigNumber("10000000"),
        false, // zeroForOne - swapping token0 (DEX) for token1 (CURRENCY)
        new BigNumber("0.20191266928539425356"),
        new BigNumber("10000000000000000000"),
        new BigNumber("-0.00000000000000000001")
      );

      swapDto1.uniqueKey = randomUniqueKey();
      const signedDto1 = swapDto1.signed(users.testUser1.privateKey);
      const swapResponse1 = await contract.Swap(ctx, signedDto1);
      console.dir(swapResponse1, { depth: null, colors: true });
    }

    const posDto = new GetPositionDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      -41000,
      -35000,
      users.testUser1.identityKey,
      undefined
    );

    const pos = await contract.GetPositions(ctx, posDto);
    console.dir(pos, { depth: null, colors: true });
    console.log(pos.Data?.liquidity.toString());
    console.log(pos.Data?.tokensOwed0.toString());
    console.log(pos.Data?.tokensOwed1.toString());

    console.log("position2 ####################################");
    const pos2Dto = new GetPositionDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      -38000,
      -32000,
      users.testUser1.identityKey,
      undefined
    );

    const pos2 = await contract.GetPositions(ctx, pos2Dto);
    console.dir(pos2, { depth: null, colors: true });
    console.log(pos2.Data?.liquidity.toString());
    console.log(pos2.Data?.tokensOwed0.toString());
    console.log(pos2.Data?.tokensOwed1.toString());

    const burnDto = new BurnDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      new BigNumber("5369645.592006477955459947"),
      -41000,
      -35000,
      new BigNumber("0"),
      new BigNumber(0),
      undefined
    );
    burnDto.uniqueKey = randomUUID();

    burnDto.sign(users.testUser1.privateKey);
    const burnRes = await contract.RemoveLiquidity(ctx, burnDto);
    console.dir(burnRes, { depth: null, colors: true });

    const burnDto2 = new BurnDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      new BigNumber("2885797.789063169198730066"),
      -38000,
      -32000,
      new BigNumber("0"),
      new BigNumber(0),
      undefined
    );
    burnDto2.uniqueKey = randomUUID();

    burnDto2.sign(users.testUser1.privateKey);
    const burnRes2 = await contract.RemoveLiquidity(ctx, burnDto2);
    console.dir(burnRes2, { depth: null, colors: true });

    const colDto = new CollectDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      new BigNumber("725758.8380956685"),
      new BigNumber("19724.3177699619"),
      -41000,
      -35000,
      undefined
    );
    colDto.uniqueKey = randomUUID();
    colDto.sign(users.testUser1.privateKey);

    const colRes = await contract.CollectPositionFees(ctx, colDto);
    console.dir(colRes, { depth: null, colors: true });

    const colDto2 = new CollectDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      new BigNumber("677051.4132491045"),
      new BigNumber("21858.7266228652"),
      -38000,
      -32000,
      undefined
    );
    colDto2.uniqueKey = randomUUID();
    colDto2.sign(users.testUser1.privateKey);

    const colRes2 = await contract.CollectPositionFees(ctx, colDto2);
    console.dir(colRes2, { depth: null, colors: true });

    console.log("##############################");
    console.dir(getWrites(), { depth: null, colors: true });

    // //When
    // Then
    // expect(response).toEqual(GalaChainResponse.Success(expectedResponse));
    // expect(getWrites()).toEqual(writesMap(expectedFeeThresholdUses, expectedPool));
  });
});
