// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat

// Runtime Environment's members available in the global scope.
import hre from "hardhat"

import IFTokenStandard from "../artifacts/contracts/IFTokenStandard.sol/IFTokenStandard.json"

export async function main(): Promise<void> {
  // params
  const token = process.env.TOKEN || "" // address
  const spender: string = process.env.SPENDER || "" // address
  const amount: string = process.env.AMOUNT || "" // amount

  // get contract from token
  const tokenContract = new hre.ethers.Contract(token, IFTokenStandard.abi)

  // mint
  const result = await tokenContract.connect((await hre.ethers.getSigners())[0]).approve(spender, amount)

  // log
  console.log("Token:", token)
  console.log("Amount:", amount)
  console.log("Spender: ", spender)
  console.log("---- Output ----")
  console.log("Tx hash:", result.hash)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
