import { keccak256, toBytes } from "viem";
import { useAccount, useReadContracts } from "wagmi";
import { badgeTokenAbi, badgeTokenAddress } from "../contracts/badgeToken";

// Role hashes are compile-time constants in AccessControl (DEFAULT_ADMIN_ROLE
// is always bytes32(0)) and in BadgeToken.sol (MINTER_ROLE/PAUSER_ROLE are
// keccak256("...")). Computing them locally instead of reading them from the
// contract first avoids a two-stage dependent query: previously, hasRole()
// couldn't fire until a separate read of these three constants had already
// succeeded, so a single flaky RPC call (this project has repeatedly hit
// transient failures on Amoy's public RPC) would silently leave isAdmin/
// isMinter/isPauser stuck at false until a full page reload retried
// everything from scratch.
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
const MINTER_ROLE = keccak256(toBytes("MINTER_ROLE"));
const PAUSER_ROLE = keccak256(toBytes("PAUSER_ROLE"));

// Shared by App (to decide whether to render the admin sidebar at all) and
// AdminPanel (to decide which forms to show inside it, and which role hash
// to pass into grantRole/revokeRole).
export function useAdminAccess() {
  const { address, isConnected } = useAccount();

  const { data: hasRoleResults } = useReadContracts({
    contracts: address
      ? [
          {
            address: badgeTokenAddress,
            abi: badgeTokenAbi,
            functionName: "hasRole",
            args: [DEFAULT_ADMIN_ROLE, address],
          } as const,
          {
            address: badgeTokenAddress,
            abi: badgeTokenAbi,
            functionName: "hasRole",
            args: [MINTER_ROLE, address],
          } as const,
          {
            address: badgeTokenAddress,
            abi: badgeTokenAbi,
            functionName: "hasRole",
            args: [PAUSER_ROLE, address],
          } as const,
        ]
      : [],
    query: { enabled: Boolean(isConnected && address) },
  });

  return {
    isConnected,
    isAdmin: hasRoleResults?.[0]?.result === true,
    isMinter: hasRoleResults?.[1]?.result === true,
    isPauser: hasRoleResults?.[2]?.result === true,
    defaultAdminRole: DEFAULT_ADMIN_ROLE,
    minterRole: MINTER_ROLE,
    pauserRole: PAUSER_ROLE,
  };
}
