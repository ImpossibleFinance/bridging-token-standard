// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat

// Runtime Environment's members available in the global scope.
import hre from "hardhat"

import AnyswapRouter from "../artifacts/contracts/mocks/AnyswapV4Router.sol/AnyswapV4Router.json"

export async function main(): Promise<void> {
  // params
  const adapter: string = process.env.ADAPTER || ""
  const router: string = process.env.ROUTER || ""
  const amount: string = process.env.AMOUNT || ""
  const destChain: number | null = process.env.DEST_CHAIN ? parseInt(process.env.DEST_CHAIN) : null

  if (destChain === null) {
    console.log("Must specify dest chain ID")
    return
  }

  // get contract
  const routerContract = new hre.ethers.Contract(router, AnyswapRouter.abi)

  // call anySwapOutUnderlying (transfer onto bridge)
  const tx = await routerContract.connect((await hre.ethers.getSigners())[0]).anySwapOutUnderlying(
    adapter, // router adapter token
    (
      await hre.ethers.getSigners()
    )[0].address, // to
    amount, // amount
    destChain // to chain ID
  )

  // log
  console.log("Swapped out:", tx.hash)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
