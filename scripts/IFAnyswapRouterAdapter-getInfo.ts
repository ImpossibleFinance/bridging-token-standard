// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat

// Runtime Environment's members available in the global scope.
import hre from "hardhat"

import IFAnyswapRouterAdapter from "../artifacts/contracts/adapters/IFAnyswapRouterAdapter.sol/IFAnyswapRouterAdapter.json"

export async function main(): Promise<void> {
  // params
  const adapter: string = process.env.ADAPTER || ""

  // get contract
  const adapterContract = new hre.ethers.Contract(adapter, IFAnyswapRouterAdapter.abi)

  // log info
  console.log("underlying:", await adapterContract.connect((await hre.ethers.getSigners())[0]).underlying())
  console.log(
    "underlyingBridgeOut:",
    await adapterContract.connect((await hre.ethers.getSigners())[0]).underlyingBridgeOut()
  )
  console.log("lockElseMintBurn:", await adapterContract.connect((await hre.ethers.getSigners())[0]).lockElseMintBurn())

  // get first router role
  const routerRole = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes("ROUTER_ROLE"))
  console.log(
    "First routerRole:",
    await adapterContract.connect((await hre.ethers.getSigners())[0]).getRoleMember(routerRole, 0)
  )
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
