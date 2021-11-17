import { Contract } from "@ethersproject/contracts"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { ethers } from "hardhat"

describe("IFTokenStandard", function () {
  // unset timeout from the test
  this.timeout(0)

  // vars for all tests
  let owner: SignerWithAddress
  let testToken: Contract

  this.beforeEach(async () => {
    // get test accounts
    owner = (await ethers.getSigners())[0]

    // deploy test token
    const TestTokenFactory = await ethers.getContractFactory("IFTokenStandard")
    testToken = await TestTokenFactory.deploy("Test Token", "TEST")
    await testToken.deployed()
  })

  it("Should mint and burn", async function () {
    // mint
    await testToken.mint(owner.address, "1000000000000000000")
    // check balance
    expect(await testToken.balanceOf(owner.address)).to.equal("1000000000000000000")
    // mint more
    await testToken.mint(owner.address, "1000000000000000000")
    // check balance
    expect(await testToken.balanceOf(owner.address)).to.equal("2000000000000000000")
    // burn
    await testToken.burn("500000000000000000")
    // check balance
    expect(await testToken.balanceOf(owner.address)).to.equal("1500000000000000000")
  })

  it("Trusted forwarder", async function () {
    // set trusted forwarder
    await testToken.setTrustedForwarder(owner.address)
    // check balance
    expect(await testToken.trustedForwarder()).to.equal(owner.address)
  })
})
