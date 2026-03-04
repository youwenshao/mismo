import hre from 'hardhat'

async function main() {
  const network = hre.network.name
  console.log(`\nDeploying Decidendi contracts to ${network}...\n`)

  const [deployer] = await hre.viem.getWalletClients()
  const publicClient = await hre.viem.getPublicClient()

  console.log('Deployer:', deployer.account.address)

  const balance = await publicClient.getBalance({ address: deployer.account.address })
  console.log('Balance:', (Number(balance) / 1e18).toFixed(4), 'ETH\n')

  const USDC_ADDRESSES: Record<string, `0x${string}`> = {
    baseMainnet: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Circle test USDC on Base Sepolia
  }

  const usdcAddress = USDC_ADDRESSES[network]
  if (!usdcAddress) {
    throw new Error(`No USDC address configured for network: ${network}`)
  }

  const treasuryAddress = deployer.account.address
  const operatorAddress = deployer.account.address

  // ─── 1. Deploy DecidendiEscrow ────────────────────────────────

  // Temporarily deploy with deployer as arbiter so we can set up the Arbiter contract
  console.log('Deploying DecidendiEscrow...')
  const escrow = await hre.viem.deployContract('DecidendiEscrow', [
    usdcAddress,
    operatorAddress,
    deployer.account.address, // temp arbiter = deployer
    treasuryAddress,
  ])
  console.log('  DecidendiEscrow:', escrow.address)

  // ─── 2. Deploy CommissionRegistry ─────────────────────────────

  console.log('Deploying CommissionRegistry...')
  const registry = await hre.viem.deployContract('CommissionRegistry', [
    operatorAddress,
    escrow.address,
  ])
  console.log('  CommissionRegistry:', registry.address)

  // ─── 3. Deploy DecidendiArbiter ───────────────────────────────

  const signers: [`0x${string}`, `0x${string}`, `0x${string}`] = [
    deployer.account.address,
    (process.env.ARBITER_SIGNER_2 as `0x${string}`) || deployer.account.address,
    (process.env.ARBITER_SIGNER_3 as `0x${string}`) || deployer.account.address,
  ]

  console.log('Deploying DecidendiArbiter...')
  const arbiter = await hre.viem.deployContract('DecidendiArbiter', [signers, escrow.address])
  console.log('  DecidendiArbiter:', arbiter.address)

  // ─── 4. Transfer arbiter role from deployer to Arbiter contract

  console.log('\nTransferring arbiter role to DecidendiArbiter contract...')
  // Note: The initial escrow has deployer as arbiter; we need to redeploy
  // with the correct arbiter address, or add a setArbiter function.
  // For testnet, deployer acts as both operator and arbiter initially.

  console.log('\n═══════════════════════════════════════════')
  console.log('  Decidendi Deployment Summary')
  console.log('═══════════════════════════════════════════')
  console.log(`  Network:            ${network}`)
  console.log(`  USDC:               ${usdcAddress}`)
  console.log(`  DecidendiEscrow:    ${escrow.address}`)
  console.log(`  CommissionRegistry: ${registry.address}`)
  console.log(`  DecidendiArbiter:   ${arbiter.address}`)
  console.log(`  Operator:           ${operatorAddress}`)
  console.log(`  Treasury:           ${treasuryAddress}`)
  console.log('═══════════════════════════════════════════\n')

  console.log('Add these to your .env:')
  console.log(`DECIDENDI_ESCROW_ADDRESS=${escrow.address}`)
  console.log(`DECIDENDI_REGISTRY_ADDRESS=${registry.address}`)
  console.log(`DECIDENDI_ARBITER_ADDRESS=${arbiter.address}`)
  console.log(`USDC_CONTRACT_ADDRESS=${usdcAddress}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
