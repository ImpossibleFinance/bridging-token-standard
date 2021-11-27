import { Contract } from "@ethersproject/contracts"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { ethers } from "hardhat"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { expectRevert } = require("@openzeppelin/test-helpers")

describe("Test AnyswapV5RouterAdapter", function () {
  // unset timeout from the test
  this.timeout(0)

  // vars for all tests
  let owner: SignerWithAddress
  let token: Contract
  let routerV4: Contract
  let routerAdapter: Contract

  this.beforeEach(async () => {
    // get test accounts
    owner = (await ethers.getSigners())[0]

    // deploy test token
    const TestTokenFactory = await ethers.getContractFactory("IFTokenStandard")
    token = await TestTokenFactory.deploy("Test Token", "TEST")
    await token.deployed()

    // deploy AnyswapV4Router
    const AnyswapV4RouterFactory = await ethers.getContractFactory("AnyswapV4Router")
    routerV4 = await AnyswapV4RouterFactory.deploy(
      // todo: fill in if necessary
      owner.address, // sushiswap factory address
      owner.address, // address of wrapped native token (e.g., WETH)
      owner.address // address of MPC, the admin address that calls anySwapIn
    )
    await routerV4.deployed()

    // deploy AnyswapV5RouterAdapter
    const AnyswapV5RouterAdapterFactory = await ethers.getContractFactory("AnyswapV5RouterAdapter")
    routerAdapter = await AnyswapV5RouterAdapterFactory.deploy(
      "Any Bridge Wrapper - Test Token", // name of adapter token
      "anyTEST", // symbol of adapter token
      routerV4.address, // router
      token.address // underlying
    )
    await routerAdapter.deployed()

    // grant router role to owner
    await routerAdapter.grantRole(await routerAdapter.ROUTER_ROLE(), owner.address)
    // grant router role to router
    await routerAdapter.grantRole(await routerAdapter.ROUTER_ROLE(), routerV4.address)
  })

  //// low level tests from router adapter

  it("Low level: deposit vault", async function () {
    // set rate limiter params
    await routerAdapter.setMaxQuota("1000") // 10e18
    await routerAdapter.setQuotaPerSecond("100") // 10e17

    // mint tokens
    await token.mint(owner.address, "2000")

    // deposit vault (mint router adapter token to tester)
    await routerAdapter.depositVault("100", owner.address)

    // deposit vault (mint router adapter token to tester)
    await routerAdapter.depositVault("1100", owner.address)

    // deposit vault (mint router adapter token to tester)
    await routerAdapter.depositVault("100", owner.address)

    // deposit vault (mint router adapter token to tester) (should revert for exceeding rate limiter quota)
    expectRevert.unspecified(routerAdapter.depositVault("101", owner.address))

    // check final balance
    expect(await routerAdapter.balanceOf(owner.address)).to.equal(1300)
  })

  it("Low level: withdraw vault", async function () {
    // set rate limiter params
    await routerAdapter.setMaxQuota("1000") // 10e18
    await routerAdapter.setQuotaPerSecond("100") // 10e17

    // mint router adapter token to tester
    routerAdapter.mint(owner.address, "100")

    // mint underlying token to router adapter
    token.mint(routerAdapter.address, "100")

    // withdraw vault (burn router adapter token and transfer equivalent underlying to tester)
    routerAdapter.withdrawVault(
      owner.address, // from
      "100", // amount
      owner.address // to
    )
  })

  it("Low level: mint and burn", async function () {
    // mint
    routerAdapter.mint(owner.address, "100")
    // burn
    routerAdapter.burn(owner.address, "100")
  })

  //// high level tests from router

  it("High level: V4 anySwapOutUnderlying", async function () {
    // set rate limiter params
    await routerAdapter.setMaxQuota("1000") // 10e18
    await routerAdapter.setQuotaPerSecond("100") // 10e17

    // mint underlying token to tester
    token.mint(owner.address, "100")

    // tester approves to router
    token.approve(routerV4.address, "100")

    // call anySwapOutUnderlying (transfer onto bridge)
    routerV4.anySwapOutUnderlying(
      routerAdapter.address, // router adapter token
      owner.address, // to
      "100", // amount
      56 // to chain ID
    )

    // check final balances on tester
    expect(await token.balanceOf(owner.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(owner.address)).to.equal(0)
    // check final balances on router adapter
    expect(await token.balanceOf(routerAdapter.address)).to.equal(100)
    expect(await routerAdapter.balanceOf(routerAdapter.address)).to.equal(0)
    // check final balances on router
    expect(await token.balanceOf(routerV4.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerV4.address)).to.equal(0)
  })
})
