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
  let ifAdapter: Contract[]
  let underlying: Contract
  let owner: SignerWithAddress
  let defaultLimit: BigNumber = convToBN(5)

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
    const ERC20Factory = await ethers.getContractFactory("TestERC20")
    underlying = await ERC20Factory.deploy(MaxUint256)

    const AdapterFactory = await ethers.getContractFactory("ImpossibleAdapter")
    ifAdapter = []
    ifAdapter.push(
      await AdapterFactory.deploy(
        "AnyTestToken",
        "AnyTT",
        underlying.address,
        Mode.LOCK,
        defaultLimit,
        defaultLimit,
        0,
        0
      )
    )

    ifAdapter.push(
      await AdapterFactory.deploy(
        "AnyTestToken",
        "AnyTT",
        underlying.address,
        Mode.MINTBURN,
        defaultLimit,
        defaultLimit,
        0,
        0
      )
    )
    for (let i: number = 0; i < 2; i++) {
      await underlying.approve(ifAdapter[i].address, MaxUint256)
    }
  })

  it("test init", async () => {
    const factory = await ethers.getContractFactory("ImpossibleAdapter")
    const vals = [convToBN(5), convToBN(7), convToBN(2), convToBN(3)]
    const ifAdapter = await factory.deploy("", "", underlying.address, 0, vals[0], vals[1], vals[2], vals[3])

    expect(await ifAdapter.globalQuota()).to.eq(vals[0])
    expect(await ifAdapter.userQuota()).to.eq(vals[1])
    expect(await ifAdapter.globalQuotaRegenRate()).to.eq(vals[2])
    expect(await ifAdapter.userQuotaRegenRate()).to.eq(vals[3])
  })

  it("test setters", async () => {
    const vals = [convToBN(5), convToBN(7), convToBN(2), convToBN(3)]
    let i: number
    for (let i: number = 0; i < 2; i++) {
      await setRates(ifAdapter[i], vals[0], vals[1], vals[2], vals[3])

      expect(await ifAdapter[i].globalQuota()).to.eq(vals[0])
      expect(await ifAdapter[i].userQuota()).to.eq(vals[1])
      expect(await ifAdapter[i].globalQuotaRegenRate()).to.eq(vals[2])
      expect(await ifAdapter[i].userQuotaRegenRate()).to.eq(vals[3])
    }
  })

  it("test deposit/withdraw amounts", async () => {
    const amt = convToBN(2)

    for (let i: number = 0; i < 2; i++) {
      await expect(await ifAdapter[i].deposit(amt))
        .to.emit(underlying, "Transfer")
        .withArgs(owner.address, ifAdapter[i].address, amt)
        .to.emit(ifAdapter[i], "Transfer")
        .withArgs(ZERO_ADDRESS, owner.address, amt)

      expect(await underlying.balanceOf(ifAdapter[i].address)).to.eq(i ? 0 : amt)

      await expect(ifAdapter[i].withdraw(amt))
        .to.emit(ifAdapter[i], "Transfer")
        .withArgs(owner.address, ZERO_ADDRESS, amt)

      expect(await underlying.balanceOf(ifAdapter[i].address)).to.eq(0)
    }
  })

  it("test deposit/withdraw gas", async () => {
    const amt = convToBN(2)
    let tx

    tx = await ifAdapter[0].deposit(amt)
    expect((await tx.wait()).gasUsed).to.eq(110883) // 110883

    tx = await ifAdapter[0].withdraw(amt)
    expect((await tx.wait()).gasUsed).to.eq(135992) // 135992

    tx = await ifAdapter[1].deposit(amt)
    expect((await tx.wait()).gasUsed).to.eq(99052) // 99052

    tx = await ifAdapter[1].withdraw(amt)
    expect((await tx.wait()).gasUsed).to.eq(139338) // 139338
  })

  it("test static quota", async () => {
    const amts = [convToBN(2), convToBN(5)]

    for (let i: number = 0; i < 2; i++) {
      await expect(await ifAdapter[i].deposit(amts[0].add(amts[1])))

      await expect(ifAdapter[i].withdraw(amts[0]))
        .to.emit(ifAdapter[i], "Transfer")
        .withArgs(owner.address, ZERO_ADDRESS, amts[0])

      await expect(ifAdapter[i].withdraw(amts[1]))
        .to.emit(ifAdapter[i], "Transfer")
        .withArgs(owner.address, ZERO_ADDRESS, defaultLimit.sub(amts[0]))
    }
  })

  const incTime = async (t: number) => {
    await network.provider.send("evm_increaseTime", [t])
    await network.provider.send("evm_mine")
  }

  const min = (a: BigNumber, b: BigNumber) => {
    return a.gte(b) ? b : a
  }

  it("test dynamic quota", async () => {
    let limit = convToBN(100)
    let increment = convToBN(5)

    const tests = [
      { withdrawAmt: convToBN(16), time: 2 },
      { withdrawAmt: convToBN(41), time: 6 },
      { withdrawAmt: convToBN(80), time: 20 },
    ]

    for (let i: number = 0; i < 2; i++) {
      await setRates(ifAdapter[i], limit, limit, increment, increment)
      await ifAdapter[i].deposit(convToBN(1000))

      let remainder: BigNumber = limit
      for (let j: number = 0; j < tests.length; j++) {
        await expect(ifAdapter[i].withdraw(tests[j].withdrawAmt))
          .to.emit(ifAdapter[i], "Transfer")
          .withArgs(owner.address, ZERO_ADDRESS, tests[j].withdrawAmt)
        await incTime(tests[j].time)
        remainder = remainder
          .sub(min(tests[j].withdrawAmt, remainder))
          .add(increment.mul(BigNumber.from(tests[j].time + Number(j != 0)))) // +1s are to account for withdraw tx incrementing time by 1
        remainder = min(remainder, limit) // cap at limit
        expect(await ifAdapter[i].getMaxConsumable(owner.address)).to.eq(remainder)
      }

      // test emptying quota
      await expect(ifAdapter[i].withdraw(convToBN(500)))
        .to.emit(ifAdapter[i], "Transfer")
        .withArgs(owner.address, ZERO_ADDRESS, min(remainder, convToBN(500)))
    }
  })

  it("test mismatched quotas", async () => {
    const limits = [
      { first: convToBN(72), second: convToBN(41), amount: convToBN(15) },
      { first: convToBN(16), second: convToBN(24), amount: convToBN(40) },
      { first: convToBN(120), second: convToBN(12), amount: convToBN(1) },
      { first: convToBN(8), second: convToBN(9), amount: convToBN(10) },
    ]
    const increment = convToBN(1000) // ignore regeneration
    for (let i: number = 0; i < 2; i++) {
      await ifAdapter[i].deposit(convToBN(1000))

      for (let j: number = 0; j < limits.length; j++) {
        await setRates(ifAdapter[i], limits[j].first, limits[j].second, increment, increment)
        let expectedLimit = min(limits[j].first, limits[j].second)
        expect(await ifAdapter[i].getMaxConsumable(owner.address)).to.eq(expectedLimit)
        await ifAdapter[i].withdraw(limits[j].amount)
        expectedLimit = limits[j].amount.gte(expectedLimit) ? _0 : expectedLimit.sub(limits[j].amount)
        expect(await ifAdapter[i].getMaxConsumable(owner.address)).to.eq(expectedLimit)
      }
    }
  })
})
