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
  const globalQuota: string = process.env.GLOBAL_QUOTA || ""
  const userQuota: string = process.env.USER_QUOTA || ""
  const userQuotaRegenRate: string = process.env.USER_QUOTA_REGEN_RATE || ""
  const globalQuotaRegenRate: string = process.env.GLOBAL_QUOTA_REGEN_RATE || ""

  // get contract
  const adapterContract = new hre.ethers.Contract(adapter, IFAnyswapRouterAdapter.abi)

  // set quotas
  if (globalQuota) {
    console.log("Setting global quota:", globalQuota)
    await adapterContract.connect((await hre.ethers.getSigners())[0]).setGlobalQuota(globalQuota)
  }
  if (userQuota) {
    console.log("Setting user quota:", userQuota)
    await adapterContract.connect((await hre.ethers.getSigners())[0]).setUserQuota(userQuota)
  }
  if (userQuotaRegenRate) {
    console.log("Setting user quota regen rate:", userQuotaRegenRate)
    await adapterContract.connect((await hre.ethers.getSigners())[0]).setUserQuotaRegenRate(userQuotaRegenRate)
  }
  if (globalQuotaRegenRate) {
    console.log("Setting global quota regen rate:", globalQuotaRegenRate)
    await adapterContract.connect((await hre.ethers.getSigners())[0]).setGlobalQuotaRegenRate(globalQuotaRegenRate)
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
