// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat

// Runtime Environment's members available in the global scope.
import hre from "hardhat"

import IFTokenStandard from "../artifacts/contracts/IFTokenStandard.sol/IFTokenStandard.json"

export async function main(): Promise<void> {
  // params
  const token: string = process.env.TOKEN || ""
  const adapter: string = process.env.ADAPTER || ""

  // get contract
  const tokenContract = new hre.ethers.Contract(token, IFTokenStandard.abi)

  // grant
  const role = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("MINTER_ROLE"))
  console.log("Granting role:", role)
  await tokenContract.connect((await hre.ethers.getSigners())[0]).grantRole(role, adapter)

  // log deployed addresses
  console.log("Granted minter role to:", adapter)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
