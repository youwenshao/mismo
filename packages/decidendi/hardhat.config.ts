import type { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox-viem'
import '@nomicfoundation/hardhat-foundry'

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
      accounts: process.env.DECIDENDI_RELAYER_PRIVATE_KEY
        ? [process.env.DECIDENDI_RELAYER_PRIVATE_KEY]
        : [],
      chainId: 84532,
    },
    baseMainnet: {
      url: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      accounts: process.env.DECIDENDI_RELAYER_PRIVATE_KEY
        ? [process.env.DECIDENDI_RELAYER_PRIVATE_KEY]
        : [],
      chainId: 8453,
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
}

export default config
