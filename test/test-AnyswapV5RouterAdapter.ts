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
  let tester: SignerWithAddress
  let mpc: SignerWithAddress
  let token: Contract
  let routerV4: Contract
  let routerAdapter: Contract

  this.beforeEach(async () => {
    // get test accounts
    owner = (await ethers.getSigners())[0]
    tester = (await ethers.getSigners())[1]
    mpc = (await ethers.getSigners())[2]

    // deploy test token
    const TestTokenFactory = await ethers.getContractFactory("IFTokenStandard")
    token = await TestTokenFactory.deploy("Test Token", "TEST")
    await token.deployed()

    // deploy AnyswapV4Router
    const AnyswapV4RouterFactory = await ethers.getContractFactory("AnyswapV4Router")
    routerV4 = await AnyswapV4RouterFactory.deploy(
      // note: these are just placeholders for now
      owner.address, // sushiswap factory address
      owner.address, // address of wrapped native token (e.g., WETH)

      mpc.address // address of MPC (the admin address that calls anySwapIn)
    )
    await routerV4.deployed()

    // deploy router adapter
    const IFAnyswapRouterAdapterFactory = await ethers.getContractFactory("IFAnyswapRouterAdapter")
    routerAdapter = await IFAnyswapRouterAdapterFactory.deploy(
      "Any Bridge Wrapper - Test Token", // name of adapter token
      "anyTEST", // symbol of adapter token
      token.address, // underlying
      true // true - locking mode, false - mint burn mode
    )
    await routerAdapter.deployed()

    // grant router role to router
    await routerAdapter.grantRole(await routerAdapter.ROUTER_ROLE(), routerV4.address)
  })

  //// low level tests from router adapter

  it("Low level: deposit vault", async function () {
    // grant router role to tester
    await routerAdapter.connect(owner).grantRole(await routerAdapter.ROUTER_ROLE(), mpc.address)

    // set rate limiter params
    await routerAdapter.connect(owner).setGlobalQuota("10000")
    await routerAdapter.connect(owner).setUserQuota("1000")
    await routerAdapter.connect(owner).setUserQuotaRegenRate("100")

    // mint tokens
    await token.connect(owner).mint(tester.address, "2000")
    await token.connect(owner).mint(routerAdapter.address, "2000")

    // deposit vault (mint router adapter token to tester)
    await routerAdapter.connect(mpc).depositVault("100", tester.address)
    await routerAdapter.connect(mpc).depositVault("1100", tester.address)
    await routerAdapter.connect(mpc).depositVault("100", tester.address)

    // deposit vault (mint router adapter token to tester) (should revert for exceeding rate limiter quota)
    expectRevert.unspecified(routerAdapter.connect(mpc).depositVault("101", tester.address))

    // check final balance
    expect(await routerAdapter.balanceOf(tester.address)).to.equal(1300)
  })

  it("Low level: withdraw vault (mint-burn)", async function () {
    // set mode
    await routerAdapter.connect(owner).setMode(false) // mint-burn

    // grant router role to tester
    await routerAdapter.connect(owner).grantRole(await routerAdapter.ROUTER_ROLE(), mpc.address)

    // set rate limiter params
    await routerAdapter.connect(owner).setGlobalQuota("10000")
    await routerAdapter.connect(owner).setUserQuota("1000")
    await routerAdapter.connect(owner).setUserQuotaRegenRate("100")

    // mint router adapter token to tester
    await routerAdapter.connect(mpc).mintAdapterToken(tester.address, "100")

    // mint underlying token to router adapter
    await token.connect(owner).mint(routerAdapter.address, "100")

    // withdraw vault (burn router adapter token and transfer equivalent underlying to tester)
    await routerAdapter.connect(mpc).withdrawVault(
      tester.address, // from
      "100", // amount
      tester.address // to
    )

    // check final balances on tester
    expect(await token.balanceOf(tester.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(tester.address)).to.equal(100)
  })

  it("Low level: withdraw vault (locking)", async function () {
    // set mode
    await routerAdapter.connect(owner).setMode(true) // locking

    // grant router role to tester
    await routerAdapter.connect(owner).grantRole(await routerAdapter.ROUTER_ROLE(), mpc.address)

    // set rate limiter params
    await routerAdapter.connect(owner).setGlobalQuota("10000")
    await routerAdapter.connect(owner).setUserQuota("1000")
    await routerAdapter.connect(owner).setUserQuotaRegenRate("100")

    // mint router adapter token to tester
    await routerAdapter.connect(mpc).mintAdapterToken(tester.address, "100")

    // mint underlying token to router adapter
    await token.connect(owner).mint(routerAdapter.address, "100")

    // withdraw vault (burn router adapter token and transfer equivalent underlying to tester)
    await routerAdapter.connect(mpc).withdrawVault(
      tester.address, // from
      "100", // amount
      tester.address // to
    )

    // check final balances on tester
    expect(await token.balanceOf(tester.address)).to.equal(100)
    expect(await routerAdapter.balanceOf(tester.address)).to.equal(0)
  })

  it("Low level: mint and burn", async function () {
    // grant router role to tester
    await routerAdapter.connect(owner).grantRole(await routerAdapter.ROUTER_ROLE(), mpc.address)

    // mint
    await routerAdapter.connect(mpc).mintAdapterToken(tester.address, "100")

    // check final balances on tester
    expect(await token.balanceOf(tester.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(tester.address)).to.equal(100)

    // burn
    await routerAdapter.connect(mpc).burn(tester.address, "100")
  })

  //// high level tests from router

  it("High level: V4 anySwapOutUnderlying (mint-burn)", async function () {
    // set mode
    await routerAdapter.connect(owner).setMode(false)

    // set rate limiter params
    await routerAdapter.connect(owner).setGlobalQuota("10000")
    await routerAdapter.connect(owner).setUserQuota("1000")
    await routerAdapter.connect(owner).setUserQuotaRegenRate("100")

    // mint underlying token to tester
    await token.connect(owner).mint(tester.address, "100")

    // tester approves to router
    await token.connect(tester).approve(routerV4.address, "100")

    // call anySwapOutUnderlying (transfer onto bridge)
    await routerV4.connect(tester).anySwapOutUnderlying(
      routerAdapter.address, // router adapter token
      tester.address, // to
      "100", // amount
      56 // to chain ID
    )

    // check final balances on tester
    expect(await token.balanceOf(tester.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(tester.address)).to.equal(0)
    // check final balances on router adapter
    expect(await token.balanceOf(routerAdapter.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerAdapter.address)).to.equal(0)
    // check final balances on router
    expect(await token.balanceOf(routerV4.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerV4.address)).to.equal(0)
  })

  it("High level: V4 anySwapOutUnderlying (locking mode)", async function () {
    // set mode
    await routerAdapter.connect(owner).setMode(true)

    // set rate limiter params
    await routerAdapter.connect(owner).setGlobalQuota("10000")
    await routerAdapter.connect(owner).setUserQuota("1000")
    await routerAdapter.connect(owner).setUserQuotaRegenRate("100")

    // mint underlying token to tester
    await token.connect(owner).mint(tester.address, "100")

    // tester approves to router
    await token.connect(tester).approve(routerV4.address, "100")

    // call anySwapOutUnderlying (transfer onto bridge)
    await routerV4.connect(tester).anySwapOutUnderlying(
      routerAdapter.address, // router adapter token
      tester.address, // to
      "100", // amount
      56 // to chain ID
    )

    // check final balances on tester
    expect(await token.balanceOf(tester.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(tester.address)).to.equal(0)
    // check final balances on router adapter
    expect(await token.balanceOf(routerAdapter.address)).to.equal(100)
    expect(await routerAdapter.balanceOf(routerAdapter.address)).to.equal(0)
    // check final balances on router
    expect(await token.balanceOf(routerV4.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerV4.address)).to.equal(0)
  })

  it("High level: V4 anySwapInAuto (adapter underlying balance < amount) (locking)", async function () {
    // set mode
    await routerAdapter.connect(owner).setMode(true) // locking

    // grant router role to tester
    await routerAdapter.connect(owner).grantRole(await routerAdapter.ROUTER_ROLE(), mpc.address)
    // grant minter role to adapter
    await token.connect(owner).grantRole(await token.MINTER_ROLE(), routerAdapter.address)

    // set rate limiter params
    await routerAdapter.connect(owner).setGlobalQuota("10000")
    await routerAdapter.connect(owner).setUserQuota("1000")
    await routerAdapter.connect(owner).setUserQuotaRegenRate("100")

    // call anySwapInAuto (transfer off of bridge)
    await routerV4.connect(mpc).anySwapInAuto(
      "0x0000000000000000000000000000000000000000000000000000000000000000", // txs (transaction hash from origin chain)
      routerAdapter.address, // router adapter token
      tester.address, // to
      "100", // amount
      1 // from chain ID
    )

    // check final balances on tester
    expect(await token.balanceOf(tester.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(tester.address)).to.equal(100)
    // check final balances on router adapter
    expect(await token.balanceOf(routerAdapter.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerAdapter.address)).to.equal(0)
    // check final balances on router
    expect(await token.balanceOf(routerV4.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerV4.address)).to.equal(0)
  })

  it("High level: V4 anySwapInAuto (adapter underlying balance < amount) (mint-burn)", async function () {
    // set mode
    await routerAdapter.connect(owner).setMode(false) // mint-burn

    // grant router role to tester
    await routerAdapter.connect(owner).grantRole(await routerAdapter.ROUTER_ROLE(), mpc.address)
    // grant minter role to adapter
    await token.connect(owner).grantRole(await token.MINTER_ROLE(), routerAdapter.address)

    // set rate limiter params
    await routerAdapter.connect(owner).setGlobalQuota("10000")
    await routerAdapter.connect(owner).setUserQuota("1000")
    await routerAdapter.connect(owner).setUserQuotaRegenRate("100")

    // call anySwapInAuto (transfer off of bridge)
    await routerV4.connect(mpc).anySwapInAuto(
      "0x0000000000000000000000000000000000000000000000000000000000000000", // txs (transaction hash from origin chain)
      routerAdapter.address, // router adapter token
      tester.address, // to
      "100", // amount
      1 // from chain ID
    )

    // check final balances on tester
    expect(await token.balanceOf(tester.address)).to.equal(100)
    expect(await routerAdapter.balanceOf(tester.address)).to.equal(0)
    // check final balances on router adapter
    expect(await token.balanceOf(routerAdapter.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerAdapter.address)).to.equal(0)
    // check final balances on router
    expect(await token.balanceOf(routerV4.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerV4.address)).to.equal(0)
  })

  it("High level: V4 anySwapInAuto (adapter underlying balance >= amount) (locking)", async function () {
    // set mode
    await routerAdapter.connect(owner).setMode(true) // locking

    // grant router role to tester
    await routerAdapter.connect(owner).grantRole(await routerAdapter.ROUTER_ROLE(), mpc.address)
    // grant minter role to adapter
    await token.connect(owner).grantRole(await token.MINTER_ROLE(), routerAdapter.address)

    // set rate limiter params
    await routerAdapter.connect(owner).setGlobalQuota("10000")
    await routerAdapter.connect(owner).setUserQuota("1000")
    await routerAdapter.connect(owner).setUserQuotaRegenRate("100")

    // mint underlying token to adapter
    await token.connect(owner).mint(routerAdapter.address, "420")

    // call anySwapInAuto (transfer off of bridge)
    await routerV4.connect(mpc).anySwapInAuto(
      "0x0000000000000000000000000000000000000000000000000000000000000000", // txs (transaction hash from origin chain)
      routerAdapter.address, // router adapter token
      tester.address, // to
      "100", // amount
      1 // from chain ID
    )

    // check final balances on tester
    expect(await token.balanceOf(tester.address)).to.equal(100)
    expect(await routerAdapter.balanceOf(tester.address)).to.equal(0)
    // check final balances on router adapter
    expect(await token.balanceOf(routerAdapter.address)).to.equal(320) // what we started with
    expect(await routerAdapter.balanceOf(routerAdapter.address)).to.equal(0)
    // check final balances on router
    expect(await token.balanceOf(routerV4.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerV4.address)).to.equal(0)
  })

  it("High level: V4 anySwapInAuto (adapter underlying balance >= amount) (mint-burn)", async function () {
    // set mode
    await routerAdapter.connect(owner).setMode(false) // mint-burn

    // grant router role to tester
    await routerAdapter.connect(owner).grantRole(await routerAdapter.ROUTER_ROLE(), mpc.address)
    // grant minter role to adapter
    await token.connect(owner).grantRole(await token.MINTER_ROLE(), routerAdapter.address)

    // set rate limiter params
    await routerAdapter.connect(owner).setGlobalQuota("10000")
    await routerAdapter.connect(owner).setUserQuota("1000")
    await routerAdapter.connect(owner).setUserQuotaRegenRate("100")

    // mint underlying token to adapter
    await token.connect(owner).mint(routerAdapter.address, "420")

    // call anySwapInAuto (transfer off of bridge)
    await routerV4.connect(mpc).anySwapInAuto(
      "0x0000000000000000000000000000000000000000000000000000000000000000", // txs (transaction hash from origin chain)
      routerAdapter.address, // router adapter token
      tester.address, // to
      "100", // amount
      1 // from chain ID
    )

    // check final balances on tester
    expect(await token.balanceOf(tester.address)).to.equal(100)
    expect(await routerAdapter.balanceOf(tester.address)).to.equal(0)
    // check final balances on router adapter
    expect(await token.balanceOf(routerAdapter.address)).to.equal(420) // what we started with
    expect(await routerAdapter.balanceOf(routerAdapter.address)).to.equal(0)
    // check final balances on router
    expect(await token.balanceOf(routerV4.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerV4.address)).to.equal(0)
  })

  it("Emergency token retrieve", async function () {
    // deploy some other token
    const TestTokenFactory = await ethers.getContractFactory("IFTokenStandard")
    const token2 = await TestTokenFactory.deploy("Test Token 2", "TEST2")
    await token2.deployed()

    // mint underlying token to adapter
    await token.connect(owner).mint(routerAdapter.address, "100")
    // mint test2 token to adapter
    await token2.connect(owner).mint(routerAdapter.address, "100")

    // attempt retrievals
    await routerAdapter.emergencyTokenRetrieve(token2.address)
    expectRevert.unspecified(routerAdapter.emergencyTokenRetrieve(token.address))

    // check final balances on owner
    expect(await token.balanceOf(owner.address)).to.equal(0)
    expect(await token2.balanceOf(owner.address)).to.equal(100)
    // check final balances on router adapter
    expect(await token.balanceOf(routerAdapter.address)).to.equal(100)
    expect(await token2.balanceOf(routerAdapter.address)).to.equal(0)
  })

  it("Compatibity with AnyswapV5ERC20 (mint-burn)", async function () {
    //// SET UP ANYSWAP TOKEN

    // deploy anyswap erc20 token
    const TestTokenFactory = await ethers.getContractFactory("AnyswapV5ERC20")
    const token2 = await TestTokenFactory.deploy(
      "Anyswap Foo Token", // name
      "anyFOO", // symbol
      18, // decimals
      token.address, // underlying token
      mpc.address // vault
    )
    await token2.deployed()

    // init vault
    await token2.connect(mpc).initVault(mpc.address)

    //// SET UP ROUTER ADAPTER (overwrite default one)

    // deploy router adapter (for anyswap token)
    const IFAnyswapRouterAdapterFactory = await ethers.getContractFactory("IFAnyswapRouterAdapter")
    routerAdapter = await IFAnyswapRouterAdapterFactory.deploy(
      "Any Bridge Wrapper - Test Token", // name of adapter token
      "anyTEST", // symbol of adapter token
      token2.address, // underlying
      false // true - locking mode, false - mint burn mode
    )
    await routerAdapter.deployed()

    // grant router role to router
    await routerAdapter.grantRole(await routerAdapter.ROUTER_ROLE(), routerV4.address)

    // set rate limiter params
    await routerAdapter.connect(owner).setGlobalQuota("10000")
    await routerAdapter.connect(owner).setUserQuota("1000")
    await routerAdapter.connect(owner).setUserQuotaRegenRate("100")

    //// TEST

    // mint underlying (anyswap) token to tester
    await token2.connect(mpc).mint(tester.address, "100")

    // tester approves to router
    await token2.connect(tester).approve(routerV4.address, "100")

    // call anySwapOutUnderlying (transfer onto bridge)
    await routerV4.connect(tester).anySwapOutUnderlying(
      routerAdapter.address, // router adapter token
      tester.address, // to
      "100", // amount
      56 // to chain ID
    )

    // check final balances on tester
    expect(await token2.balanceOf(tester.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(tester.address)).to.equal(0)
    // check final balances on router adapter
    expect(await token2.balanceOf(routerAdapter.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerAdapter.address)).to.equal(0)
    // check final balances on router
    expect(await token2.balanceOf(routerV4.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerV4.address)).to.equal(0)
    // check final balances at 0xDEAD
    expect(await token2.balanceOf("0x000000000000000000000000000000000000DEAD")).to.equal(100)
    expect(await routerAdapter.balanceOf("0x000000000000000000000000000000000000DEAD")).to.equal(0)
  })

  it("Compatibity with AnyswapV5ERC20 (locking)", async function () {
    //// SET UP ANYSWAP TOKEN

    // deploy anyswap erc20 token
    const TestTokenFactory = await ethers.getContractFactory("AnyswapV5ERC20")
    const token2 = await TestTokenFactory.deploy(
      "Anyswap Foo Token", // name
      "anyFOO", // symbol
      18, // decimals
      token.address, // underlying token
      mpc.address // vault
    )
    await token2.deployed()

    // init vault
    await token2.connect(mpc).initVault(mpc.address)

    //// SET UP ROUTER ADAPTER (overwrite default one)

    // deploy router adapter (for anyswap token)
    const IFAnyswapRouterAdapterFactory = await ethers.getContractFactory("IFAnyswapRouterAdapter")
    routerAdapter = await IFAnyswapRouterAdapterFactory.deploy(
      "Any Bridge Wrapper - Test Token", // name of adapter token
      "anyTEST", // symbol of adapter token
      token2.address, // underlying
      true // true - locking mode, false - mint burn mode
    )
    await routerAdapter.deployed()

    // grant router role to router
    await routerAdapter.grantRole(await routerAdapter.ROUTER_ROLE(), routerV4.address)

    // set rate limiter params
    await routerAdapter.connect(owner).setGlobalQuota("10000")
    await routerAdapter.connect(owner).setUserQuota("1000")
    await routerAdapter.connect(owner).setUserQuotaRegenRate("100")

    //// TEST

    // mint underlying (anyswap) token to tester
    await token2.connect(mpc).mint(tester.address, "100")

    // tester approves to router
    await token2.connect(tester).approve(routerV4.address, "100")

    // call anySwapOutUnderlying (transfer onto bridge)
    await routerV4.connect(tester).anySwapOutUnderlying(
      routerAdapter.address, // router adapter token
      tester.address, // to
      "100", // amount
      56 // to chain ID
    )

    // check final balances on tester
    expect(await token2.balanceOf(tester.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(tester.address)).to.equal(0)
    // check final balances on router adapter
    expect(await token2.balanceOf(routerAdapter.address)).to.equal(100)
    expect(await routerAdapter.balanceOf(routerAdapter.address)).to.equal(0)
    // check final balances on router
    expect(await token2.balanceOf(routerV4.address)).to.equal(0)
    expect(await routerAdapter.balanceOf(routerV4.address)).to.equal(0)
    // check final balances at 0xDEAD
    expect(await token2.balanceOf("0x000000000000000000000000000000000000DEAD")).to.equal(0)
    expect(await routerAdapter.balanceOf("0x000000000000000000000000000000000000DEAD")).to.equal(0)
  })
})
