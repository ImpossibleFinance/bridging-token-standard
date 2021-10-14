import { expect } from "chai"
import { ethers } from "hardhat"

describe("Token", function () {
  it("Should deploy", async function () {
    const TokenFactory = await ethers.getContractFactory("AnyswapV5ERC20")
    const token = await TokenFactory.deploy(
      "token name",
      "TKN",
      18,
      "0x0000000000000000000000000000000000000000", // underlying
      "0x0000000000000000000000000000000000000000" // vault
    )
    await token.deployed()

    expect(await token.symbol()).to.equal("TKN")
  })
})
