import * as dotenv from "dotenv"

import { HardhatUserConfig } from "hardhat/config"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-waffle"
import "@typechain/hardhat"
import "hardhat-gas-reporter"
import "solidity-coverage"

dotenv.config()

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.10",
    settings: {
      optimizer: { enabled: true },
    },
  },
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 0,
      },
      allowUnlimitedContractSize: false,
    },
    bsc_test: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 11000000000,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    bsc_main: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 6000000000,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    eth_ropsten: {
      url: "https://ropsten.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    eth_main: {
      url: "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    polygon_main: {
      url: "https://polygon-rpc.com",
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    polygon_mumbai: {
      // recommended by polygon
      url: "https://matic-testnet-archive-rpc.bwarelabs.com",
      gasPrice: 25000000000,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    avax_main: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
    moonriver_main: {
      url: "https://rpc.moonriver.moonbeam.network",
      chainId: 1285,
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
    },
  },
}

export default config
