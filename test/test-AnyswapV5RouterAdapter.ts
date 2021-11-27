import { Contract } from "@ethersproject/contracts"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { ethers } from "hardhat"

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

    // set rate limiter params
    await routerAdapter.setMaxQuota("1000000000000000000") // 10e18
    await routerAdapter.setQuotaPerSecond("1000000000000000000") // 10e17

    // grant router role to owner
    await routerAdapter.grantRole(await routerAdapter.ROUTER_ROLE(), owner.address)
  })

  it("Deposit vault", async function () {
    // deposit vault
    routerAdapter.depositVault("100", owner.address)
  })

  it("Withdraw vault", async function () {
    // withdraw vault
    // todo: fix params
    routerAdapter.withdrawVault(owner.address, "100", owner.address)
  })

  it("Mint", async function () {
    // mint
    // todo: fix params
    routerAdapter.mint(owner.address, "100")
  })

  it("Burn", async function () {
    // burn
    // todo: fix params
    routerAdapter.burn(owner.address, "100")
  })
})
