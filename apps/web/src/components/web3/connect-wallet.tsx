'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected, coinbaseWallet } from 'wagmi/connectors'

export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="ml-2 text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() =>
          connect({
            connector: coinbaseWallet({ appName: 'Mismo', preference: 'smartWalletOnly' }),
          })
        }
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? 'Connecting...' : 'Coinbase Wallet'}
      </button>
      <button
        onClick={() => connect({ connector: injected() })}
        disabled={isPending}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800"
      >
        MetaMask
      </button>
    </div>
  )
}
