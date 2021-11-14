import { expect } from "chai"
import { ethers } from "hardhat"

describe("IFTokenStandard", function () {
  it("Should deploy", async function () {
    // deploy token
    const TokenFactory = await ethers.getContractFactory("IFTokenStandard")
    const token = await TokenFactory.deploy("token name", "TKN")
    await token.deployed()

    expect(await token.symbol()).to.equal("TKN")
  })
})
