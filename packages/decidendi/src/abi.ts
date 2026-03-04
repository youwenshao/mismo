export const DECIDENDI_ESCROW_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_usdc', type: 'address' },
      { name: '_operator', type: 'address' },
      { name: '_arbiter', type: 'address' },
      { name: '_treasury', type: 'address' },
    ],
  },
  {
    type: 'function',
    name: 'lockDeposit',
    inputs: [
      { name: 'commissionId', type: 'bytes32' },
      { name: 'payer', type: 'address' },
      { name: 'depositAmount', type: 'uint256' },
      { name: 'finalAmount', type: 'uint256' },
      { name: 'deadlineAt', type: 'uint256' },
      { name: 'prdHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'completeMilestone',
    inputs: [
      { name: 'commissionId', type: 'bytes32' },
      { name: 'milestone', type: 'uint8' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'clientAccept',
    inputs: [{ name: 'commissionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'lockFinal',
    inputs: [{ name: 'commissionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'releaseFinal',
    inputs: [{ name: 'commissionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'dispute',
    inputs: [
      { name: 'commissionId', type: 'bytes32' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'voidContract',
    inputs: [{ name: 'commissionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reclaimExpired',
    inputs: [{ name: 'commissionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getCommission',
    inputs: [{ name: 'commissionId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'commissionId', type: 'bytes32' },
          { name: 'payer', type: 'address' },
          { name: 'payee', type: 'address' },
          { name: 'depositAmount', type: 'uint256' },
          { name: 'finalAmount', type: 'uint256' },
          { name: 'totalAmount', type: 'uint256' },
          { name: 'currentMilestone', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'deadlineAt', type: 'uint256' },
          { name: 'disputed', type: 'bool' },
          { name: 'voided', type: 'bool' },
          { name: 'prdHash', type: 'bytes32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'extendDeadline',
    inputs: [
      { name: 'commissionId', type: 'bytes32' },
      { name: 'newDeadline', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'acceptedAt',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'finalLocked',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'DepositLocked',
    inputs: [
      { name: 'commissionId', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'deadline', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneCompleted',
    inputs: [
      { name: 'commissionId', type: 'bytes32', indexed: true },
      { name: 'milestone', type: 'uint8', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ClientAccepted',
    inputs: [
      { name: 'commissionId', type: 'bytes32', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'FinalLocked',
    inputs: [
      { name: 'commissionId', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'FinalReleased',
    inputs: [
      { name: 'commissionId', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DisputeRaised',
    inputs: [
      { name: 'commissionId', type: 'bytes32', indexed: true },
      { name: 'by', type: 'address', indexed: false },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ContractVoided',
    inputs: [
      { name: 'commissionId', type: 'bytes32', indexed: true },
      { name: 'refundAmount', type: 'uint256', indexed: false },
    ],
  },
] as const

export const COMMISSION_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'registerCommission',
    inputs: [
      { name: 'commissionId', type: 'bytes32' },
      { name: 'prdHash', type: 'bytes32' },
      { name: 'client', type: 'address' },
      { name: 'depositAmount', type: 'uint256' },
      { name: 'finalAmount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'recordBuildComplete',
    inputs: [{ name: 'commissionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'recordDelivered',
    inputs: [
      { name: 'commissionId', type: 'bytes32' },
      { name: 'deliveryHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'recordAccepted',
    inputs: [{ name: 'commissionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'recordFinalized',
    inputs: [{ name: 'commissionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'verify',
    inputs: [{ name: 'commissionId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'commissionId', type: 'bytes32' },
          { name: 'prdHash', type: 'bytes32' },
          { name: 'deliveryHash', type: 'bytes32' },
          { name: 'client', type: 'address' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'buildCompletedAt', type: 'uint256' },
          { name: 'deliveredAt', type: 'uint256' },
          { name: 'acceptedAt', type: 'uint256' },
          { name: 'finalizedAt', type: 'uint256' },
          { name: 'depositAmountUsdc', type: 'uint256' },
          { name: 'finalAmountUsdc', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'verifyPrdHash',
    inputs: [
      { name: 'commissionId', type: 'bytes32' },
      { name: 'prdHash', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalCommissions',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

export const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const
