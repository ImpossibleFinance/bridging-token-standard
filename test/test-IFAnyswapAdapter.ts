import "@nomiclabs/hardhat-ethers"
import { ethers, network } from "hardhat"
import { expect } from "chai"
import { BigNumber } from "ethers"
import { Contract } from "@ethersproject/contracts"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

const MaxUint256 = ethers.constants.MaxUint256
const WeiPerEth = ethers.constants.WeiPerEther
const _0 = ethers.constants.Zero
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const convToBN = (num: number) => {
  return BigNumber.from(num).mul(WeiPerEth)
}

export default describe("test ImpossibleAdapter", async () => {
  let srcUnderlying: Contract
  let dstUnderlying: Contract
  let srcAdapter: Contract
  let dstAdapter: Contract
  let anyswapRouter: Contract
  let owner: SignerWithAddress

  const flowLimit = convToBN(5)
  const holdingAmt = convToBN(100)
  const underlyingAmt = convToBN(10000)

  const MOCK_CHAINID = 0

  enum Mode {
    LOCK,
    MINTBURN,
  }

  const setRates = async (target: Contract, a: BigNumber, b: BigNumber, c: BigNumber, d: BigNumber) => {
    await target.setGlobalQuota(a)
    await target.setUserQuota(b)
    await target.setGlobalQuotaRegenRate(c)
    await target.setUserQuotaRegenRate(d)
  }

  beforeEach(async () => {
    ;[owner] = await ethers.getSigners()

    const RouterFactory = await ethers.getContractFactory("AnyswapV4Router")
    anyswapRouter = await RouterFactory.deploy(ZERO_ADDRESS, ZERO_ADDRESS, owner.address)

    const ERC20Factory = await ethers.getContractFactory("TestERC20")
    srcUnderlying = await ERC20Factory.deploy(underlyingAmt)
    dstUnderlying = await ERC20Factory.deploy(underlyingAmt)

    await srcUnderlying.approve(anyswapRouter.address, MaxUint256)
    await dstUnderlying.approve(anyswapRouter.address, MaxUint256)

    const AdapterFactory = await ethers.getContractFactory("IFAnyswapAdapter")
    srcAdapter = await AdapterFactory.deploy(
      `AnyTestToken`,
      `AnyTT`,
      srcUnderlying.address,
      Mode.LOCK,
      flowLimit,
      flowLimit,
      0,
      0
    )

    dstAdapter = await AdapterFactory.deploy(
      `AnyTestToken`,
      `AnyTT`,
      dstUnderlying.address,
      Mode.MINTBURN,
      flowLimit,
      flowLimit,
      0,
      0
    )

    await srcUnderlying.transfer(srcAdapter.address, holdingAmt)
    await dstUnderlying.transfer(dstAdapter.address, holdingAmt)

    await srcAdapter.grantRole(
      "0x7a05a596cb0ce7fdea8a1e1ec73be300bdb35097c944ce1897202f7a13122eb2",
      anyswapRouter.address
    )
    await dstAdapter.grantRole(
      "0x7a05a596cb0ce7fdea8a1e1ec73be300bdb35097c944ce1897202f7a13122eb2",
      anyswapRouter.address
    )
  })

  const min = (a: BigNumber, b: BigNumber) => {
    return a.gte(b) ? b : a
  }

  const bridgeAmt = [convToBN(2), convToBN(7)]

  for (let i: number = 0; i < bridgeAmt.length; i++) {
    it(`test bridge src to dst ${i}`, async () => {
      // called on src chain
      expect(await anyswapRouter.anySwapOutUnderlying(srcAdapter.address, owner.address, bridgeAmt[i], MOCK_CHAINID))
        .to.emit(srcUnderlying, "Transfer")
        .withArgs(owner.address, srcAdapter.address, bridgeAmt[i])
        .to.emit(srcAdapter, "Transfer") // minting adapter token
        .withArgs(ZERO_ADDRESS, owner.address, bridgeAmt[i])
        .to.emit(srcAdapter, "Transfer") // burning adapter token
        .withArgs(owner.address, ZERO_ADDRESS, bridgeAmt[i])

      const remainder = bridgeAmt[i].gte(flowLimit) ? bridgeAmt[i].sub(flowLimit) : _0

      // called on dst chain
      expect(
        await anyswapRouter.anySwapInAuto(
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          dstAdapter.address,
          owner.address,
          bridgeAmt[i],
          MOCK_CHAINID
        )
      )
        .to.emit(dstAdapter, "Transfer") // mints adapter
        .withArgs(ZERO_ADDRESS, owner.address, bridgeAmt[i])
        .to.emit(dstUnderlying, "Transfer") // mints underlying
        .withArgs(ZERO_ADDRESS, owner.address, min(bridgeAmt[i], flowLimit))

      expect(await dstAdapter.balanceOf(owner.address)).to.eq(remainder)
      const dstBalance = underlyingAmt.sub(holdingAmt).add(min(bridgeAmt[i], flowLimit))
      expect(await dstUnderlying.balanceOf(owner.address)).to.eq(dstBalance)
    })
  }

  for (let i: number = 0; i < bridgeAmt.length; i++) {
    it(`test bridge dst to src ${i}`, async () => {
      // called on dst chain
      expect(await anyswapRouter.anySwapOutUnderlying(dstAdapter.address, owner.address, bridgeAmt[i], MOCK_CHAINID))
        .to.emit(dstUnderlying, "Transfer") 
        .withArgs(owner.address, dstAdapter.address, bridgeAmt[i])
        .to.emit(dstUnderlying, "Transfer") // burn underlying
        .withArgs(dstAdapter.address, ZERO_ADDRESS, bridgeAmt[i])
        .to.emit(dstAdapter, "Transfer") // minting adapter token
        .withArgs(ZERO_ADDRESS, owner.address, bridgeAmt[i])
        .to.emit(dstAdapter, "Transfer") // burning adapter token
        .withArgs(owner.address, ZERO_ADDRESS, bridgeAmt[i])

      const remainder = bridgeAmt[i].gte(flowLimit) ? bridgeAmt[i].sub(flowLimit) : _0

      // called on dst chain
      expect(
        await anyswapRouter.anySwapInAuto(
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          srcAdapter.address,
          owner.address,
          bridgeAmt[i],
          MOCK_CHAINID
        )
      )
        .to.emit(srcAdapter, "Transfer") // mints adapter
        .withArgs(ZERO_ADDRESS, owner.address, bridgeAmt[i])
        .to.emit(srcUnderlying, "Transfer") // transfers underlying
        .withArgs(srcAdapter.address, owner.address, min(bridgeAmt[i], flowLimit))

      expect(await srcAdapter.balanceOf(owner.address)).to.eq(remainder)
      const srcBalance = underlyingAmt.sub(holdingAmt).add(min(bridgeAmt[i], flowLimit))
      expect(await srcUnderlying.balanceOf(owner.address)).to.eq(srcBalance)
    })
  }
})
