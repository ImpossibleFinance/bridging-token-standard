import { Contract } from "@ethersproject/contracts"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { ethers } from "hardhat"

import MockERC1363PayableMetadata from "../artifacts/contracts/mocks/MockERC1363PayableContract.sol/MockERC1363PayableContract.json"

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

  it("Can set trusted forwarder", async function () {
    // set trusted forwarder
    await testToken.setTrustedForwarder(owner.address)
    // check trusted forwarder
    expect(await testToken.trustedForwarder()).to.equal(owner.address)
  })

  it("Can check mint role", async function () {
    // get role
    const minterRole = await testToken.MINTER_ROLE()
    // check role
    expect(await testToken.getRoleMemberCount(minterRole)).to.equal(1)
  })

  it("Can transfer and call", async function () {
    // get interface of mock payable (1363) contract
    const erc1363PayableInterface = new ethers.utils.Interface(MockERC1363PayableMetadata.abi)

    // deploy mock payable (1363) contract
    const MockERC1363PayableContractFactory = await ethers.getContractFactory("MockERC1363PayableContract")
    const mockERC1363PayableContract = await MockERC1363PayableContractFactory.deploy(testToken.address)
    await mockERC1363PayableContract.deployed()

    // mint
    await testToken.mint(owner.address, "1000000000000000000")

    // foo starts at 0
    expect(await mockERC1363PayableContract.foo()).to.equal(0)

    // transfer and call (with additional data)
    const result = await testToken["transferAndCall(address,uint256,bytes)"](
      mockERC1363PayableContract.address,
      "1000000000000000000",
      erc1363PayableInterface.encodeFunctionData("setFoo", [1234])
    )
    result.wait()

    // foo should update
    expect(await mockERC1363PayableContract.foo()).to.equal(1234)

    // check balances
    expect(await testToken.balanceOf(owner.address)).to.equal("0")
    expect(await testToken.balanceOf(mockERC1363PayableContract.address)).to.equal("1000000000000000000")
  })
})
