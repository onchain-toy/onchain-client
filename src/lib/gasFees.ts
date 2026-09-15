// Amoy's public RPC free tiers can reject wallet-auto-estimated gas/fees for
// calls that are predicted to revert (huge gas limit fallback gets rejected
// by the node's own cap, or the wallet's suggested tip undershoots the
// node's enforced minimum). Fixed, generous values sidestep both - cost is
// trivial on a testnet either way (a few hundredths of a POL at most).
export const GAS_FEES = {
  gas: 300_000n,
  maxPriorityFeePerGas: 30_000_000_000n, // 30 gwei
  maxFeePerGas: 100_000_000_000n, // 100 gwei
} as const;
