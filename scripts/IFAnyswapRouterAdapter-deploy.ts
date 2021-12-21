// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat

// Runtime Environment's members available in the global scope.
import hre from "hardhat"

import Create2Deployer from "../artifacts/contracts/library/Create2Deployer.sol/Create2Deployer.json"

// IF cross chain create2 address
const create2Address = "0x790DeEB2929201067a460974612c996D2A25183d"

export async function main(): Promise<void> {
  // params
  const name: string = process.env.NAME || ""
  const symbol: string = process.env.SYMBOL || ""
  const underlying: string = process.env.UNDERLYING || ""
  const lockElseMintBurn = true // we hard code this to prevent confusion on output address when used with create2
  const create2: number | null = process.env.CREATE2 ? parseInt(process.env.CREATE2) : null // create2 nonce

  if (create2 !== null && isNaN(create2)) {
    console.log("Failed to parse create2 nonce - please use an integer")
    return
  }

  // We get the contract to deploy
  const IFAnyswapRouterAdapterFactory = await hre.ethers.getContractFactory("IFAnyswapRouterAdapter")

  // deploy token
  let IFAnyswapRouterAdapter
  if (create2) {
    console.log("Deploying with create2 nonce", create2)
    // get create2 contract
    const create2DeployerContract = new hre.ethers.Contract(
      create2Address, // IF cross chain create2 address
      Create2Deployer.abi
    )

    const encoder = hre.ethers.utils.defaultAbiCoder
    const encodePacked = hre.ethers.utils.solidityPack

    const encodedArguments = encoder.encode(
      ["string", "string", "address", "bool"],
      [name, symbol, underlying, lockElseMintBurn]
    )
    const constructorCode = encodePacked(["bytes", "bytes"], [IFAnyswapRouterAdapterFactory.bytecode, encodedArguments])

    console.log("Encoded arguments", encodedArguments)

    // create2 deploy
    IFAnyswapRouterAdapter = await create2DeployerContract.connect((await hre.ethers.getSigners())[0]).deploy(
      constructorCode,
      create2 // salt
    )

    // log deployed addresses
    console.log(
      "Deployed to ",
      await ((await IFAnyswapRouterAdapter.wait()).events as { address: string; args: { addr: string } }[]).find(
        (x) => x.address === create2Address
      )?.args?.addr
    )
  } else {
    console.log("Deploying without create2")
    // normal deploy
    IFAnyswapRouterAdapter = await IFAnyswapRouterAdapterFactory.deploy(name, symbol, underlying, lockElseMintBurn)

    // log deployed addresses
    console.log("Deployed to ", IFAnyswapRouterAdapter.address)
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
