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
  let router: Contract
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
    router = await AnyswapV4RouterFactory.deploy(
      // todo: fill in if necessary
      owner.address, // sushiswap factory address
      owner.address, // address of wrapped native token
      owner.address // address of MPC, the admin address that calls anySwapIn
    )
    await router.deployed()

    // deploy AnyswapV5RouterAdapter
    const AnyswapV5RouterAdapterFactory = await ethers.getContractFactory("AnyswapV5RouterAdapter")
    routerAdapter = await AnyswapV5RouterAdapterFactory.deploy(
      "Any Bridge Wrapper - Test Token",
      "anyTEST",
      router.address,
      token.address
    )
    await routerAdapter.deployed()

    // grant router role to owner
    await routerAdapter.grantRole(await routerAdapter.ROUTER_ROLE(), owner.address)
  })

  it("Deposit vault", async function () {
    // set rate limiter params
    await routerAdapter.setMaxQuota("1000") // 10e18
    await routerAdapter.setQuotaPerSecond("100") // 10e17

    // mint tokens
    await token.mint(owner.address, "2000")

    // deposit vault (mint router adapter token to caller)
    await routerAdapter.depositVault("100", owner.address)

    // deposit vault (mint router adapter token to caller)
    await routerAdapter.depositVault("1100", owner.address)

    // deposit vault (mint router adapter token to caller)
    await routerAdapter.depositVault("100", owner.address)

    // deposit vault (mint router adapter token to caller) (should revert for exceeding rate limiter quota)
    expectRevert.unspecified(routerAdapter.depositVault("101", owner.address))

    // check final balance
    expect(await routerAdapter.balanceOf(owner.address)).to.equal(1300)
  })

  it("Withdraw vault", async function () {
    // set rate limiter params
    await routerAdapter.setMaxQuota("1000") // 10e18
    await routerAdapter.setQuotaPerSecond("100") // 10e17

    // mint router adapter token to tester
    routerAdapter.mint(owner.address, "100")

    // mint underlying token to router adapter
    token.mint(routerAdapter.address, "100")

    // withdraw vault (burn router adapter token and transfer equivalent underlying to caller)
    routerAdapter.withdrawVault(
      owner.address, // from
      "100", // amount
      owner.address // to
    )
  })

  it("Mint and burn", async function () {
    // mint
    routerAdapter.mint(owner.address, "100")
    // burn
    routerAdapter.burn(owner.address, "100")
  })
})
