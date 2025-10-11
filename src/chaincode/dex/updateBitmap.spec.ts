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
import { TokenBalance, TokenClass, TokenClassKey, TokenInstance, asValidUserAlias } from "@gala-chain/api";
import { GalaChainContext } from "@gala-chain/chaincode";
import { currency, fixture, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";
import { randomUUID } from "crypto";

import { genTickRange, generateKeyFromClassKey } from ".";
import {
  AddLiquidityDTO,
  BurnDto,
  CollectDto,
  DexFeeConfig,
  DexFeePercentageTypes,
  DexPositionData,
  DexPositionOwner,
  GetPoolDto,
  Pool,
  SwapDto,
  TickData,
  UpdatePoolBitmapDto
} from "../../api/types";
import { sqrtPriceToTick } from "../../api/utils/dex/tick.helper";
import { DexV3Contract } from "../DexV3Contract";
import dex from "../test/dex";
import transactions from "./data1.json";

const positions = [
  {
    poolHash: "e4ca6c446087cb1d49713a19b9903fed92052fd1bf24d3b21c01d57e209d1e18",
    positionId: "3dfa63d9d0033e65bfd2c1eda28c302f032535fe17687405387b4134ad8ea7cd",
    tickUpper: -1000,
    tickLower: -6400,
    liquidity: "370038.674130339492053628",
    feeGrowthInside0Last: "0",
    feeGrowthInside1Last: "0",
    tokensOwed0: "0",
    tokensOwed1: "0",
    token0ClassKey: {
      additionalKey: "ETH",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    token1ClassKey: {
      additionalKey: "USDT",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    fee: 10000
  },
  {
    poolHash: "e4ca6c446087cb1d49713a19b9903fed92052fd1bf24d3b21c01d57e209d1e18",
    positionId: "1851e6e602696e30890ae7fecf9feae276508151e516c25fcc709b8cb086e250",
    tickUpper: -1600,
    tickLower: -5600,
    liquidity: "1950.145871742175073142",
    feeGrowthInside0Last: "0.00640137260774812326",
    feeGrowthInside1Last: "0.00540001208191670322",
    tokensOwed0: "49.93444145793380166827371763036827148292",
    tokensOwed1: "42.12324507563092806426374669157838691724",
    token0ClassKey: {
      additionalKey: "ETH",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    token1ClassKey: {
      additionalKey: "USDT",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    fee: 10000
  },
  {
    poolHash: "e4ca6c446087cb1d49713a19b9903fed92052fd1bf24d3b21c01d57e209d1e18",
    positionId: "b7c04cc75e39a54c7e9a6ad95bb00dbdac4eb638ac1cb4ed66bff278a2d677d0",
    tickUpper: -2200,
    tickLower: -4000,
    liquidity: "12261.434082853941069018",
    feeGrowthInside0Last: "0",
    feeGrowthInside1Last: "0",
    tokensOwed0: "0",
    tokensOwed1: "0",
    token0ClassKey: {
      additionalKey: "ETH",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    token1ClassKey: {
      additionalKey: "USDT",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    fee: 10000
  },
  {
    poolHash: "e4ca6c446087cb1d49713a19b9903fed92052fd1bf24d3b21c01d57e209d1e18",
    positionId: "05a47dd2435526843fbb76cbede93f95ec45fb778319f728991d6585ca3877b9",
    tickUpper: -2200,
    tickLower: -6200,
    liquidity: "20445.345331090350260132",
    feeGrowthInside0Last: "0.00103760871687275164",
    feeGrowthInside1Last: "0.00118254797576869406",
    tokensOwed0: "20.46981826668533755575148899989282311452",
    tokensOwed1: "21.47417191023172836157147510109179064987",
    token0ClassKey: {
      additionalKey: "ETH",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    token1ClassKey: {
      additionalKey: "USDT",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    fee: 10000
  },
  {
    poolHash: "e4ca6c446087cb1d49713a19b9903fed92052fd1bf24d3b21c01d57e209d1e18",
    positionId: "080b4801cb1cee40afcf14f85e4e07394e8a902ea56fbf97cffb775ee49d4fbe",
    tickUpper: -400,
    tickLower: -4600,
    liquidity: "26738.219114482256747123",
    feeGrowthInside0Last: "0",
    feeGrowthInside1Last: "0",
    tokensOwed0: "0",
    tokensOwed1: "0",
    token0ClassKey: {
      additionalKey: "ETH",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    token1ClassKey: {
      additionalKey: "USDT",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    fee: 10000
  },
  {
    poolHash: "e4ca6c446087cb1d49713a19b9903fed92052fd1bf24d3b21c01d57e209d1e18",
    positionId: "ac6e797a86f0f9f80b91d2beecbb7cb2c7ca5fa801ed090749e3ba3e1bbec722",
    tickUpper: 13800,
    tickLower: -9200,
    liquidity: "151811.270029710364626534",
    feeGrowthInside0Last: "0.02867266119023795283",
    feeGrowthInside1Last: "0.0187222859896979507",
    tokensOwed0: "3144.2725975145129624707165095908938071399",
    tokensOwed1: "2053.104537791548029197673168926793174471",
    token0ClassKey: {
      additionalKey: "ETH",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    token1ClassKey: {
      additionalKey: "USDT",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    fee: 10000
  },
  {
    poolHash: "e4ca6c446087cb1d49713a19b9903fed92052fd1bf24d3b21c01d57e209d1e18",
    positionId: "537b549ed7491f3c067ff46b932c06e0ec9d3f4dfaba6bc908760cbfc45964ee",
    tickUpper: 2800,
    tickLower: -1200,
    liquidity: "519564.079606409986666923",
    feeGrowthInside0Last: "0",
    feeGrowthInside1Last: "0",
    tokensOwed0: "0",
    tokensOwed1: "0",
    token0ClassKey: {
      additionalKey: "ETH",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    token1ClassKey: {
      additionalKey: "USDT",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    fee: 10000
  },
  {
    poolHash: "e4ca6c446087cb1d49713a19b9903fed92052fd1bf24d3b21c01d57e209d1e18",
    positionId: "dd32be47e48ceacad3169b6ad2dac9fcdd7a4f9a7eca03ef90fc504d3e7c6914",
    tickUpper: 3400,
    tickLower: -2400,
    liquidity: "3639.878446464689871477",
    feeGrowthInside0Last: "0",
    feeGrowthInside1Last: "0",
    tokensOwed0: "0",
    tokensOwed1: "0",
    token0ClassKey: {
      additionalKey: "ETH",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    token1ClassKey: {
      additionalKey: "USDT",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    fee: 10000
  },
  {
    poolHash: "e4ca6c446087cb1d49713a19b9903fed92052fd1bf24d3b21c01d57e209d1e18",
    positionId: "11193acc9e4183de0e2676fdbce5c21a6743b476d1d14edf31207864943f8be9",
    tickUpper: 400,
    tickLower: -3600,
    liquidity: "0",
    feeGrowthInside0Last: "0.00064708244608054256",
    feeGrowthInside1Last: "0.00046257732192446047",
    tokensOwed0: "298.18514537997467867933382712756438458736",
    tokensOwed1: "213.16245993536957010454843977489382922807",
    token0ClassKey: {
      additionalKey: "ETH",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    token1ClassKey: {
      additionalKey: "USDT",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    fee: 10000
  },
  {
    poolHash: "e4ca6c446087cb1d49713a19b9903fed92052fd1bf24d3b21c01d57e209d1e18",
    positionId: "ea08df6289d423120231f25c7bbd3923dc932f075d9535229205fd19346fd665",
    tickUpper: 886800,
    tickLower: -886800,
    liquidity: "18220.821741759089824162",
    feeGrowthInside0Last: "0.02059417815597820168",
    feeGrowthInside1Last: "0.01074943085819921088",
    tokensOwed0: "1459.82740075062676391229126615751733551734",
    tokensOwed1: "764.86204325664279151653096462721353481167",
    token0ClassKey: {
      additionalKey: "ETH",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    token1ClassKey: {
      additionalKey: "USDT",
      category: "new-category0",
      collection: "new-collection0",
      type: "new-type0"
    },
    fee: 10000
  }
];

//functions with old implemtaion
function flipTick(bitmap: Record<string, string>, tick: number, tickSpacing: number) {
  tick /= tickSpacing;
  const [word, pos] = positionOld(tick);
  const mask = BigInt(1) << BigInt(pos);

  //initialise the bitmask for word if required
  if (bitmap[word] == undefined) bitmap[word] = BigInt(0).toString();

  const currentMask = BigInt(bitmap[word]);
  const newMask = currentMask ^ mask;

  //update bitmask state
  bitmap[word] = newMask.toString();
}

function positionOld(tick: number): [word: number, position: number] {
  tick = Math.floor(tick);
  const wordPos = Math.trunc(tick / 256); // Equivalent to tick >> 8
  let bitPos = tick % 256; // Equivalent to tick % 256
  if (bitPos < 0) bitPos += 256; // Ensure it's always positive like uint8
  return [wordPos, bitPos];
}

it("should update the bitmap", async () => {
  const bitmap = {};
  const ticks = [...new Set(positions.map((p) => [p.tickLower, p.tickUpper]).flat())];
  for (const tick of ticks) {
    flipTick(bitmap, tick, 200);
  }

  const currencyClass: TokenClass = currency.tokenClass();
  const currencyInstance: TokenInstance = currency.tokenInstance();
  const currencyClassKey: TokenClassKey = currency.tokenClassKey();
  const dexClass: TokenClass = dex.tokenClass();
  const dexInstance: TokenInstance = dex.tokenInstance();
  const dexClassKey: TokenClassKey = dex.tokenClassKey();

  // Create normalized token keys for pool
  const token0Key = generateKeyFromClassKey(dexClassKey);
  const token1Key = generateKeyFromClassKey(currencyClassKey);
  const fee = DexFeePercentageTypes.FEE_1_PERCENT;

  // Initialize pool with manual values
  const pool = new Pool(
    token0Key,
    token1Key,
    dexClassKey,
    currencyClassKey,
    fee,
    new BigNumber("0.01664222241481084743"),
    0.1
  );

  pool.bitmap = bitmap;

  pool.liquidity = new BigNumber("19192921"); // random wrong value
  pool.grossPoolLiquidity = new BigNumber("348717210.55494320449679994");
  pool.sqrtPrice = new BigNumber("0.01664222241481084743");

  const tick = sqrtPriceToTick(pool.sqrtPrice);

  const oldValue = Object.assign({}, pool.bitmap);
  const oldLiquidity = pool.liquidity;

  const positionToAdd = positions.map((p, i) => {
    const positionData = new DexPositionData(
      pool.genPoolHash(),
      "i",
      p.tickUpper,
      p.tickLower,
      dexClassKey,
      currencyClassKey,
      fee
    );
    positionData.liquidity = new BigNumber(p.liquidity);
    positionData.tokensOwed0 = new BigNumber(p.tokensOwed0);
    positionData.tokensOwed1 = new BigNumber(p.tokensOwed1);
    return positionData;
  });

  const { ctx, contract } = fixture(DexV3Contract)
    .caClientIdentity(users.admin.identityKey, "CuratorOrg")
    .registeredUsers(users.testUser1)
    .savedState(currencyClass, currencyInstance, dexClass, dexInstance, pool, ...positionToAdd);
  let updatePoolBitmapDto = new UpdatePoolBitmapDto(dexClassKey, currencyClassKey, fee);
  updatePoolBitmapDto.uniqueKey = "anyuniquiekey";
  updatePoolBitmapDto = updatePoolBitmapDto.signed(users.admin.privateKey);
  const response = await contract.MakeBitMapChanges(ctx, updatePoolBitmapDto);

  expect(response.Data?.liquidity).not.toEqual(oldLiquidity);
  expect(response.Data?.bitmap).not.toEqual(oldValue);

  const expectedLiquidity = positions.reduce((acc, curr) => {
    if (curr.tickLower <= tick && curr.tickUpper >= tick) {
      acc = acc.plus(curr.liquidity);
    }
    return acc;
  }, new BigNumber("0"));

  expect(response.Data?.liquidity).toEqual(expectedLiquidity);
});

const rawPositions = [
  {
    id: "13d215c4ffac87168e21d1a591a8eedeffa6e62e727b0b2350a5ca5ae8b5f050",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"0.00003640169809195262","tickLower":-42800,"tickUpper":-39200,"positionId":"b894b76a19f77a3974e698f6223afbf034439ee06d84555fe77b51d0dbe74ada","tokensOwed0":"0.0000000033800707028970654633229220795","tokensOwed1":"0","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.0000107774662657607","feeGrowthInside1Last":"0"}'
  },
  {
    id: "48f0b3707b6aad46f4d06d0349a5955b78a56336d6eb526e5df5f9fc7ef9d13a",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"0","tickLower":-42800,"tickUpper":-37000,"positionId":"7e2c321f3e237328910a24040843ac7d7cbf65b49df335ed37e42f6533acc7de","tokensOwed0":"0.00000000403584908527121700569823937364","tokensOwed1":"0.00000007310484355681219052695793315512","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.03289374166133807098","feeGrowthInside1Last":"0.00054457827500341841"}'
  },
  {
    id: "82d853b826c2dda05646a4cdaa766a4f1b2e79e1735e0af4a41dd05ef0262d21",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"0","tickLower":-886800,"tickUpper":886800,"positionId":"bbb5299d5b67767ebded15996478dbe131bae81919805b3e99929bb2c210ad72","tokensOwed0":"0.00000000453065966942277827744442569054","tokensOwed1":"0.00000091155917138553266028389677788088","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.03288296419507231028","feeGrowthInside1Last":"0.00054457827500341841"}'
  },
  {
    id: "ed55b872e006356f835316bd527883f626f79c61d2911c5c61b7162bc0297c0d",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"0","tickLower":-43400,"tickUpper":-39200,"positionId":"0e7326e824bc3c449f09df8d235ecb23be0db635b73da53a4e72acf65a954987","tokensOwed0":"0.00000000852599071992064125796558879257","tokensOwed1":"0.00000024000930461173655015068129602757","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.00118125273469288683","feeGrowthInside1Last":"0.00000000035842435183"}'
  },
  {
    id: "fd26d544f7b368f1343129de523235501c3c532742e658c9b8a5cc08eb926239",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"0.125954608840825083","tickLower":-886800,"tickUpper":886800,"positionId":"d340799fc285f1bbc6b0faa5f1897c9a7fe3df0a9b887b3a0fd90542478cc1d4","tokensOwed0":"0","tokensOwed1":"0","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.01547781219235263588","feeGrowthInside1Last":"0.00023390548309467559"}'
  },
  {
    id: "d070356dedd5e6d67b74b27897b289d105e7c67ed02da550c8607cf0df9fce22",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"350.570529291325991259","tickLower":-43200,"tickUpper":-39200,"positionId":"3177ab016b57cfa2ed2ab0ec861e2fcb2532c654a419b0577de613a17c4f1790","tokensOwed0":"0","tokensOwed1":"0","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0","feeGrowthInside1Last":"0"}'
  },
  {
    id: "c8c3fa9a0277823cc69408d944659ba2eeb5d33445eab28e870041d5fd4604fb",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"0","tickLower":-37800,"tickUpper":-30000,"positionId":"d144334c3dc05c19336b3ea28da0a1f66e15f5a2d5977dcbd8cfb4105970c641","tokensOwed0":"0","tokensOwed1":"0","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0","feeGrowthInside1Last":"0"}'
  },
  {
    id: "247847af14a3acac4de5d890d599f8b486525bff2ae05efc73458f9e9fb91408",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"47210.867196679654074015","tickLower":-886800,"tickUpper":886800,"positionId":"3e6871f2df2dcbe5eed9e35823103258a4f74edda07e515f691521e4f86e8f90","tokensOwed0":"0.0000000085849187654499432695065165343","tokensOwed1":"0.00000014151512202388302722704141323395","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.0600154291299395539","feeGrowthInside1Last":"0.00106970254434237934"}'
  },
  {
    id: "7db4b8fad53485f03008100a7747b1bdc05bcc2d7c00a49fce6a09ef46759333",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"896301.44119637234685639","tickLower":-42800,"tickUpper":-37000,"positionId":"7c48f4c6ca02916bc88bfecd33864417b52af33ef8d0b9fb7110a8f5b5670db2","tokensOwed0":"0.000000008366417172025177590293800694","tokensOwed1":"0.0000008138415885556625573785116527989","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.06986040429137074558","feeGrowthInside1Last":"0.00111668782458685492"}'
  },
  {
    id: "9b170ec857419ed9eaf1f31dce5f22292075038d018abb09be6f479b8cc3b4de",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"7356653.489699565532233098","tickLower":-42400,"tickUpper":-37400,"positionId":"ae0340b10e8101f0d52edcbc8ab63517dcf8cd49743c9b34cd5962aa6475f1ef","tokensOwed0":"0","tokensOwed1":"0","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0","feeGrowthInside1Last":"0"}'
  },
  {
    id: "d0ab1584320772480bf7c708ebfbb579f92a0859ebe7c71428d8c142be87ed92",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"0","tickLower":-43600,"tickUpper":-39400,"positionId":"1f8f2345d40d0b5c00402aeb9be38c78c47adcc9f1e3b79c9fbfdc5e24ade07d","tokensOwed0":"0.00000000236070700020540568986117966018","tokensOwed1":"0.00000039784649142536808096012732563711","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.02304003566312719687","feeGrowthInside1Last":"0.00045553591087656876"}'
  },
  {
    id: "e577da50de12fb623a000ab79d0f4084350387488a8ca73e4117dd981a2d1749",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"338.794644116966089808","tickLower":-43200,"tickUpper":-39000,"positionId":"8d1f2bd230d52668a35d6727c53b509138be4dfbe759d3d8e18facf25efdf99f","tokensOwed0":"0","tokensOwed1":"0","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.0167047334649388538","feeGrowthInside1Last":"0.00028359006692306656"}'
  },
  {
    id: "abacca528cea6107c28febcf5ffdf00b8329da51a2fb101cee1b30a484d36812",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"33.685170806087761979","tickLower":-44000,"tickUpper":-39800,"positionId":"cb874406222d08f8a53f2dfdb1911111e2f87ebf9e6caa79871459c98944bb65","tokensOwed0":"0.00000000587997230218620012723802529076","tokensOwed1":"0.00000064878129829132549407980326735392","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.00703005507210238044","feeGrowthInside1Last":"0.00016777854011287648"}'
  },
  {
    id: "a48b17f76e3d9f697e5669c282ac0c7b7d8fcf15a7b9dc94dad02c558d69068b",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"0","tickLower":-41000,"tickUpper":-40200,"positionId":"bbb5bbb1aec7615a93c25692973b11f3eefc437399415c1ff9513e65a4abc281","tokensOwed0":"0","tokensOwed1":"0","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0","feeGrowthInside1Last":"0"}'
  },
  {
    id: "5947f3110fd4d3cc705065cd1e9621c35e4da1eea30087cb7647fcfefee15987",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"0","tickLower":-41400,"tickUpper":-39800,"positionId":"697ed29efe9025dbacc80f26a2e772c1b724538658dd8f1c5610f3eb8816afa7","tokensOwed0":"0","tokensOwed1":"0","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.00545356828747673764","feeGrowthInside1Last":"0.00008157504946913116"}'
  },
  {
    id: "0be6690f42ec4d8b5451bef11d0804af4b8e81d25bfb6999faf55c3b800b9315",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"13371.476912322164604983","tickLower":-41400,"tickUpper":-40200,"positionId":"776a686597573f7901bdd87d6aed42782b83be010dd09e15e2bfc3ce74491946","tokensOwed0":"0","tokensOwed1":"0","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.00545356828747673764","feeGrowthInside1Last":"0.00008157504946913116"}'
  },
  {
    id: "fc5ca636ee9675a89dad6c871efabd0ea5b0e361b711e64f98610dc3e8191336",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"0","tickLower":-42600,"tickUpper":-38600,"positionId":"18eb66a817ba85915c63e1152243cb63b467c8ba991837c2465da72c810bdd38","tokensOwed0":"0","tokensOwed1":"0","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0","feeGrowthInside1Last":"0"}'
  },
  {
    id: "0ccd5cf38723945aef94c7fa8255c8f94a5e84bd2cec1ee327a7fc3414fdc6d0",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"5418.557446244279737869","tickLower":-44800,"tickUpper":-36400,"positionId":"235e8e131d0459c010aba186963d9201e152da2138f6ce4dc7950dada0605a62","tokensOwed0":"0","tokensOwed1":"0","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0","feeGrowthInside1Last":"0"}'
  },
  {
    id: "f934f70c5ace3dca9151b1c45fc695bfa72980853bcc0c2441f76bfd13d7cac5",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"0","tickLower":-44800,"tickUpper":-40800,"positionId":"0c746190c1a05da8f03446c1fed23a9ac60c6340e0655db1889222991b66e6b0","tokensOwed0":"0.00000000925106152622938477106876991673","tokensOwed1":"0.00000092510930856645855989022149083836","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.01676130664582227746","feeGrowthInside1Last":"0.00013267068737666065"}'
  },
  {
    id: "c82d5ebe46b48fefcaf2e76622a6680387156c3f436fdfecbe30069c416f98ea",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"306648.655788383944605776","tickLower":-44200,"tickUpper":-40200,"positionId":"b8c92737d6883358dc54933db59b2e9b60cb47b88f243151f36f081a697678e8","tokensOwed0":"0.00000000217382056212164195696498002384","tokensOwed1":"0.00000035956470420887166106062782057328","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.01275793616630740409","feeGrowthInside1Last":"0.00022008000715365003"}'
  },
  {
    id: "82cb084421252a9eb51c21e3fe95a2c1c44deae01a33e3f596d7e147fb421879",
    key0: "GCDXCHLPDA",
    key1: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    value:
      '{"fee":10000,"poolHash":"cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742","liquidity":"7251571.012864833718764086","tickLower":-42800,"tickUpper":-38800,"positionId":"1d0ebb94b43834db538a6ac516e40745a3fa06f7904eb935e5705c06d71c9b5e","tokensOwed0":"0","tokensOwed1":"0","token0ClassKey":{"type":"none","category":"Unit","collection":"GALA","additionalKey":"none"},"token1ClassKey":{"type":"none","category":"Unit","collection":"GUSDT","additionalKey":"none"},"feeGrowthInside0Last":"0.08204173503305728822","feeGrowthInside1Last":"0.00132283802214902481"}'
  }
];

const currencyInstance: TokenInstance = currency.tokenInstance();
const currencyClass: TokenClass = currency.tokenClass();
const currencyClassKey: TokenClassKey = currency.tokenClassKey();
const currencyBalance: TokenBalance = currency.tokenBalance();

const dexInstance: TokenInstance = dex.tokenInstance();
const dexClass: TokenClass = dex.tokenClass();
const dexClassKey: TokenClassKey = dex.tokenClassKey();
const dexBalance: TokenBalance = dex.tokenBalance();

const pool = new Pool(
  dexClassKey.toStringKey(),
  currencyClassKey.toStringKey(),
  dexClassKey,
  currencyClassKey,
  DexFeePercentageTypes.FEE_1_PERCENT,
  new BigNumber("0.12721498369859634479")
);

pool.bitmap = {
  "17": "4835703278458516698824704",
  "-1": "21849196163936523649024",
  "-18": "23945242826029513411849172299223580994042798784118784"
};

pool.feeGrowthGlobal0 = new BigNumber("0.08364888398632207665");
pool.feeGrowthGlobal1 = new BigNumber("0.00135901865527021225");
pool.liquidity = new BigNumber("77700334.21013429122367135062");

let parsedPositions: DexPositionData[] = [];
for (const position of rawPositions) {
  const parse = plainToInstance(DexPositionData, JSON.parse(position.value));
  parse.poolHash = pool.genPoolHash();
  parsedPositions.push(parse);
}

const dexFeeConfig: DexFeeConfig = new DexFeeConfig([asValidUserAlias(users.admin.identityKey)], 0.1);

it("test pool", async () => {
  console.dir(parsedPositions, { depth: null, colors: true });
  const { ctx, contract } = fixture<GalaChainContext, DexV3Contract>(DexV3Contract)
    .registeredUsers(users.testUser1)
    .savedState(
      currencyInstance,
      currencyClass,
      currencyBalance,
      dexFeeConfig,
      dexInstance,
      dexClass,
      dexBalance,
      pool,
      ...parsedPositions
    )
    .savedRangeState([]);

  const dto = new UpdatePoolBitmapDto(dexClassKey, currencyClassKey, 10000);
  const res = await contract.GetBitMapChanges(ctx, dto);
  console.dir(res, { depth: null, colors: true });
});

const latestTick = [
  {
    feeGrowthOutside0: "0",
    feeGrowthOutside1: "0",
    initialised: true,
    liquidityGross: "33.685170806087761979",
    liquidityNet: "-33.685170806087761979",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: -39800
  },

  {
    feeGrowthOutside0: "0.05279474290505844411",
    feeGrowthOutside1: "0.00084678699416266995",
    initialised: true,
    liquidityGross: "33.685170806087761979",
    liquidityNet: "33.685170806087761979",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: -44000
  },
  {
    feeGrowthOutside0: "0",
    feeGrowthOutside1: "0",
    initialised: false,
    liquidityGross: "0",
    liquidityNet: "0",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: -30000
  },

  {
    feeGrowthOutside0: "0",
    feeGrowthOutside1: "0",
    initialised: false,
    liquidityGross: "0",
    liquidityNet: "0",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: -37800
  },

  {
    feeGrowthOutside0: "0",
    feeGrowthOutside1: "0",
    initialised: true,
    liquidityGross: "350.57056569302408321162",
    liquidityNet: "-350.57056569302408321162",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: -39200
  },

  {
    feeGrowthOutside0: "0.04312006451222197075",
    feeGrowthOutside1: "0.00073097546735247987",
    initialised: true,
    liquidityGross: "350.570529291325991259",
    liquidityNet: "350.570529291325991259",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: -43200
  },

  {
    feeGrowthOutside0: "0",
    feeGrowthOutside1: "0",
    initialised: true,
    liquidityGross: "896301.44119637234685639",
    liquidityNet: "-896301.44119637234685639",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: -37000
  },

  {
    feeGrowthOutside0: "0",
    feeGrowthOutside1: "0",
    initialised: true,
    liquidityGross: "896301.44123277404494834262",
    liquidityNet: "896301.44123277404494834262",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: -42800
  },

  {
    feeGrowthOutside0: "0.0000107774662657607",
    feeGrowthOutside1: "0",
    initialised: true,
    liquidityGross: "47210.993151288494899098",
    liquidityNet: "47210.993151288494899098",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: -886800
  },
  {
    feeGrowthOutside0: "0",
    feeGrowthOutside1: "0",
    initialised: true,
    liquidityGross: "47210.993151288494899098",
    liquidityNet: "-47210.993151288494899098",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: 886800
  },

  {
    feeGrowthOutside0: "0",
    feeGrowthOutside1: "0",
    initialised: true,
    liquidityGross: "2934102.849205997437085334",
    liquidityNet: "-2934102.849205997437085334",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: -39400
  },
  {
    feeGrowthOutside0: "0.03289348402880339379",
    feeGrowthOutside1: "0.00053575430835418325",
    initialised: true,
    liquidityGross: "2934102.849205997437085334",
    liquidityNet: "2934102.849205997437085334",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: -43600
  },
  {
    feeGrowthOutside0: "0",
    feeGrowthOutside1: "0",
    initialised: false,
    liquidityGross: "0",
    liquidityNet: "0",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    tick: -43400
  }
];

const latestPositions = [
  {
    fee: 10000,
    feeGrowthInside0Last: "0",
    feeGrowthInside1Last: "0",
    liquidity: "33.685170806087761979",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    positionId: "cb874406222d08f8a53f2dfdb1911111e2f87ebf9e6caa79871459c98944bb65",
    tickLower: -44000,
    tickUpper: -39800,
    token0ClassKey: { additionalKey: "none", category: "Unit", collection: "GALA", type: "none" },
    token1ClassKey: { additionalKey: "none", category: "Unit", collection: "GUSDT", type: "none" },
    tokensOwed0: "0",
    tokensOwed1: "0"
  },
  {
    fee: 10000,
    feeGrowthInside0Last: "0.051648509115773804",
    feeGrowthInside1Last: "0.00084667936162548384",
    liquidity: "896301.44119637234685639",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    positionId: "7c48f4c6ca02916bc88bfecd33864417b52af33ef8d0b9fb7110a8f5b5670db2",
    tickLower: -42800,
    tickUpper: -37000,
    token0ClassKey: { additionalKey: "none", category: "Unit", collection: "GALA", type: "none" },
    token1ClassKey: { additionalKey: "none", category: "Unit", collection: "GUSDT", type: "none" },
    tokensOwed0: "0.0000000035670474906701196712823209978",
    tokensOwed1: "0.0000003263473666731251834268693935977"
  },
  {
    fee: 10000,
    feeGrowthInside0Last: "0.0516377316495080433",
    feeGrowthInside1Last: "0.00084667936162548384",
    liquidity: "47210.867196679654074015",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    positionId: "3e6871f2df2dcbe5eed9e35823103258a4f74edda07e515f691521e4f86e8f90",
    tickLower: -886800,
    tickUpper: 886800,
    token0ClassKey: { additionalKey: "none", category: "Unit", collection: "GALA", type: "none" },
    token1ClassKey: { additionalKey: "none", category: "Unit", collection: "GUSDT", type: "none" },
    tokensOwed0: "0.0000000059751268317431887500358594753",
    tokensOwed1: "0.00000028048694749323967946409339280145"
  },
  {
    fee: 10000,
    feeGrowthInside0Last: "0.01156944832241864293",
    feeGrowthInside1Last: "0.0002136947615762821",
    liquidity: "2934102.849205997437085334",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    positionId: "1f8f2345d40d0b5c00402aeb9be38c78c47adcc9f1e3b79c9fbfdc5e24ade07d",
    tickLower: -43600,
    tickUpper: -39400,
    token0ClassKey: { additionalKey: "none", category: "Unit", collection: "GALA", type: "none" },
    token1ClassKey: { additionalKey: "none", category: "Unit", collection: "GUSDT", type: "none" },
    tokensOwed0: "0.00000000008749453616495774344288578862",
    tokensOwed1: "0.0000008013656136409785213733281567214"
  },

  {
    fee: 10000,
    feeGrowthInside0Last: "0",
    feeGrowthInside1Last: "0",
    liquidity: "350.570529291325991259",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    positionId: "3177ab016b57cfa2ed2ab0ec861e2fcb2532c654a419b0577de613a17c4f1790",
    tickLower: -43200,
    tickUpper: -39200,
    token0ClassKey: { additionalKey: "none", category: "Unit", collection: "GALA", type: "none" },
    token1ClassKey: { additionalKey: "none", category: "Unit", collection: "GUSDT", type: "none" },
    tokensOwed0: "0",
    tokensOwed1: "0"
  },

  {
    fee: 10000,
    feeGrowthInside0Last: "0.01547781219235263588",
    feeGrowthInside1Last: "0.00023390548309467559",
    liquidity: "0.125954608840825083",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    positionId: "d340799fc285f1bbc6b0faa5f1897c9a7fe3df0a9b887b3a0fd90542478cc1d4",
    tickLower: -886800,
    tickUpper: 886800,
    token0ClassKey: { additionalKey: "none", category: "Unit", collection: "GALA", type: "none" },
    token1ClassKey: { additionalKey: "none", category: "Unit", collection: "GUSDT", type: "none" },
    tokensOwed0: "0",
    tokensOwed1: "0"
  },
  {
    fee: 10000,
    feeGrowthInside0Last: "0.0000107774662657607",
    feeGrowthInside1Last: "0",
    liquidity: "0.00003640169809195262",
    poolHash: "cc93185e6902353cc0e912099790826089d3e3cba8e1e5aa3d5eba9d0c31d742",
    positionId: "b894b76a19f77a3974e698f6223afbf034439ee06d84555fe77b51d0dbe74ada",
    tickLower: -42800,
    tickUpper: -39200,
    token0ClassKey: { additionalKey: "none", category: "Unit", collection: "GALA", type: "none" },
    token1ClassKey: { additionalKey: "none", category: "Unit", collection: "GUSDT", type: "none" },
    tokensOwed0: "0.0000000033800707028970654633229220795",
    tokensOwed1: "0"
  }
];

const oldPool = new Pool(
  dexClassKey.toStringKey(),
  currencyClassKey.toStringKey(),
  dexClassKey,
  currencyClassKey,
  DexFeePercentageTypes.FEE_1_PERCENT,
  new BigNumber("0.129420930130791095")
);

oldPool.bitmap = {
  "-1": "2363056744720964255744",
  "-18": "23945242826029513411849172299223580994042798784118784",
  "17": "4835703278458516698824704"
};

// oldPool.bitmap = {
//   "-1": "144115256795332608",
//   "-17": "23945242826029513411849172299223580994042798784118784",
//   "0": "2362912629464168923136",
//   "17": "4835703278458516698824704"
// };

oldPool.feeGrowthGlobal0 = new BigNumber("0.05344359638809725679");
oldPool.feeGrowthGlobal1 = new BigNumber("0.0008971046799885381");
oldPool.liquidity = new BigNumber("3877999.53929015739068601262");
oldPool.protocolFeesToken0 = new BigNumber("11358.2320600001960361837421681284899");
oldPool.protocolFeesToken1 = new BigNumber("192.70474931857656316007093039134239474536740138682234");

let latParsedPositions: DexPositionData[] = [];
const positionOwner = new DexPositionOwner(users.testUser1.identityKey, oldPool.genPoolHash());
for (const position of latestPositions) {
  const parse = plainToInstance(DexPositionData, position);
  parse.poolHash = oldPool.genPoolHash();
  latParsedPositions.push(parse);
  positionOwner.addPosition(genTickRange(parse.tickLower, parse.tickUpper), parse.positionId);
}

let latParsedTicks: TickData[] = [];
for (const tick of latestTick) {
  const parse = plainToInstance(TickData, tick);
  parse.poolHash = oldPool.genPoolHash();
  latParsedTicks.push(parse);
}

currencyBalance.addQuantity(new BigNumber("100000000000"));
dexBalance.addQuantity(new BigNumber("100000000000"));

const currencyPoolBalance = plainToInstance(TokenBalance, {
  ...currency.tokenBalancePlain(),
  owner: pool.getPoolAlias()
});

const dexPoolBalance = plainToInstance(TokenBalance, {
  ...dex.tokenBalancePlain(),
  owner: pool.getPoolAlias()
});

currencyPoolBalance.addQuantity(new BigNumber("100000000000"));
dexPoolBalance.addQuantity(new BigNumber("100000000000"));

console.log("update?", currencyPoolBalance.getQuantityTotal().toString());

it("test pool", async () => {
  console.dir(parsedPositions, { depth: null, colors: true });
  const { ctx, contract } = fixture<GalaChainContext, DexV3Contract>(DexV3Contract)
    .registeredUsers(users.testUser1)
    .savedState(
      currencyInstance,
      currencyClass,
      currencyBalance,
      dexFeeConfig,
      dexInstance,
      dexClass,
      dexBalance,
      oldPool,
      positionOwner,
      currencyPoolBalance,
      dexPoolBalance,
      ...latParsedPositions,
      ...latParsedTicks
    )
    .savedRangeState([]);

  // const dto = new GetPoolDto(dexClassKey, currencyClassKey, 10000);
  // const res = await contract.GetBalanceDelta(ctx, dto);

  let count = 0;
  for (const transaction of transactions) {
    // console.dir(transaction, { depth: null, colors: true });
    for (const operation of JSON.parse(transaction.action_args_method_input).operations) {
      count++;
      if (
        operation.dto.token0 != "GALA$Unit$none$none" &&
        operation.dto.token1 != "GUSDT$Unit$none$none" &&
        operation.dto.fee != 10000
      ) {
        console.log(
          "####################### SKIPPED TRANASACTION",
          count,
          " #########################################"
        );
        console.log(operation.dto.token0, operation.dto.token1, operation.dto.fee);
        continue;
      }
      // console.dir(operation, { depth: null, colors: true });
      switch (operation.method) {
        case "AddLiquidity":
          {
            console.log("adding position at", operation.dto.tickLower, operation.dto.tickUpper);
            let signedDto = new AddLiquidityDTO(
              dexClassKey,
              currencyClassKey,
              DexFeePercentageTypes.FEE_1_PERCENT,
              operation.dto.tickLower,
              operation.dto.tickUpper,
              new BigNumber(operation.dto.amount0Desired),
              new BigNumber(operation.dto.amount1Desired),
              new BigNumber(0),
              new BigNumber(0),
              undefined
            );
            signedDto.uniqueKey = randomUUID();
            signedDto = signedDto.signed(users.testUser1.privateKey);

            // When
            const response = await contract.AddLiquidity(ctx, signedDto);
            const amounts = response.Data?.amounts;

            console.dir(response);
          }
          break;

        case "Swap":
          let sDto = new SwapDto(
            dexClassKey,
            currencyClassKey,
            DexFeePercentageTypes.FEE_1_PERCENT,
            new BigNumber(operation.dto.amount),
            operation.dto.zeroForOne,
            operation.dto.zeroForOne
              ? new BigNumber("0.128748098711992916")
              : new BigNumber("0.1737891483220508125"),
            new BigNumber(10000000000000000000),
            new BigNumber(-0.00000000000000000001)
          );
          sDto.uniqueKey = randomUUID();
          sDto = sDto.signed(users.testUser1.privateKey);
          const response2 = await contract.Swap(ctx, sDto);

          console.dir(JSON.stringify(response2));
          break;

        case "CollectPositionFees":
          let cDto = new CollectDto(
            dexClassKey,
            currencyClassKey,
            DexFeePercentageTypes.FEE_1_PERCENT,
            new BigNumber(operation.dto.amount0Requested),
            new BigNumber(operation.dto.amount1Requested),
            operation.dto.tickLower,
            operation.dto.tickUpper,
            undefined
          );

          cDto.uniqueKey = randomUUID();
          cDto = cDto.signed(users.testUser1.privateKey);
          const res = await contract.CollectPositionFees(ctx, cDto);
          console.log(JSON.stringify(res.Status != 1 ? res : "success"));
          break;
        case "RemoveLiquidity":
          console.log("removing position at", operation.dto.tickLower, operation.dto.tickUpper);
          let rDto = new BurnDto(
            dexClassKey,
            currencyClassKey,
            DexFeePercentageTypes.FEE_1_PERCENT,
            new BigNumber(operation.dto.amount),
            operation.dto.tickLower,
            operation.dto.tickUpper,
            new BigNumber(0),
            new BigNumber(0),
            undefined
          );
          rDto.uniqueKey = randomUUID();
          rDto = rDto.signed(users.testUser1.privateKey);
          const removeLiqu = await contract.RemoveLiquidity(ctx, rDto);
          console.log(JSON.stringify(removeLiqu.Status != 1 ? removeLiqu : "success"));
          break;
        default:
          console.log("unhandled");
      }
    }

    const dto = new GetPoolDto(dexClassKey, currencyClassKey, 10000);
    const res = await contract.GetBitMapChanges(ctx, dto);

    if (res.Data?.expectedLiquidity != transaction.liquidity) {
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.log("Error at ", transaction.block_number);
      console.log("Expected: ", res.Data?.liquidity, " Actual: ", transaction.liquidity);
      break;
    }

    console.log(
      "####################### FINISHED TRANASACTION",
      count,
      " #########################################"
    );
    if (count == 500) break;
  }
  // console.dir(res, { depth: null, colors: true });
});

it.only("should do somethin I guess", async () => {
  const pool = new Pool(
    dexClassKey.toStringKey(),
    currencyClassKey.toStringKey(),
    dexClassKey,
    currencyClassKey,
    10000,
    new BigNumber("0.1262019437786254621")
  );

  pool.bitmap = {
    "-1": "608454991184943644672",
    "-18": "23945242826029513411849172299223580994042798784118784",
    "-2": "93536104789177786765035829293842113257979682750464",
    "0": "1",
    "17": "4835703278458516698824704"
  };
  pool.liquidity = new BigNumber("40348205.111202970299780229");
  pool.feeGrowthGlobal0 = new BigNumber("0.1391091712747467583");
  pool.feeGrowthGlobal1 = new BigNumber("0.00507964879660169475");

  const pos = new DexPositionData(
    pool.genPoolHash(),
    "tdwawada",
    -41400,
    -37400,
    dexClassKey,
    currencyClassKey,
    10000
  );

  pos.liquidity = new BigNumber("16469939.71878931722773556");
  pos.feeGrowthInside0Last = new BigNumber("0.1248058903420742039");
  pos.feeGrowthInside1Last = new BigNumber("0.00491833003557717328");

  const tick = new TickData(pool.genPoolHash(), -41400);
  tick.feeGrowthOutside0 = new BigNumber("0.01306221656102902268");
  tick.feeGrowthOutside1 = new BigNumber("0.00014120820059450113");
  tick.initialised = true;
  tick.liquidityGross = new BigNumber("16469939.71878931722773556");
  tick.liquidityNet = new BigNumber("16469939.71878931722773556");

  const { ctx, contract } = fixture<GalaChainContext, DexV3Contract>(DexV3Contract)
    .registeredUsers(users.testUser1)
    .savedState(
      currencyInstance,
      currencyClass,
      currencyBalance,
      dexFeeConfig,
      dexInstance,
      dexClass,
      dexBalance,
      pool,
      positionOwner,
      currencyPoolBalance,
      dexPoolBalance,
      pos,
      tick
    )
    .savedRangeState([]);

  const swapDto = new SwapDto(
    dexClassKey,
    currencyClassKey,
    10000,
    new BigNumber("89564.74705695195"),
    true,
    new BigNumber("0.126166952506200798"),
    new BigNumber("89564.74705695195"),
    new BigNumber("-0")
  );
  swapDto.uniqueKey = "fdsbseadwvsfse";
  swapDto.sign(users.testUser1.privateKey);

  const res = await contract.Swap(ctx, swapDto);
  console.dir(res, { depth: null, colors: true });
});
