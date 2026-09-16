import { useAccount, useReadContracts } from "wagmi";
import { badgeTokenAbi, badgeTokenAddress } from "../contracts/badgeToken";

// Shared by App (to decide whether to render the admin sidebar at all) and
// AdminPanel (to decide which forms to show inside it, and which role hash
// to pass into grantRole/revokeRole).
export function useAdminAccess() {
  const { address, isConnected } = useAccount();

  const { data: roles } = useReadContracts({
    contracts: [
      { address: badgeTokenAddress, abi: badgeTokenAbi, functionName: "DEFAULT_ADMIN_ROLE" } as const,
      { address: badgeTokenAddress, abi: badgeTokenAbi, functionName: "MINTER_ROLE" } as const,
      { address: badgeTokenAddress, abi: badgeTokenAbi, functionName: "PAUSER_ROLE" } as const,
    ],
    query: { enabled: isConnected },
  });

  const defaultAdminRole = roles?.[0]?.result as `0x${string}` | undefined;
  const minterRole = roles?.[1]?.result as `0x${string}` | undefined;
  const pauserRole = roles?.[2]?.result as `0x${string}` | undefined;

  const { data: hasRoleResults } = useReadContracts({
    contracts:
      defaultAdminRole && minterRole && pauserRole && address
        ? [
            {
              address: badgeTokenAddress,
              abi: badgeTokenAbi,
              functionName: "hasRole",
              args: [defaultAdminRole, address],
            } as const,
            {
              address: badgeTokenAddress,
              abi: badgeTokenAbi,
              functionName: "hasRole",
              args: [minterRole, address],
            } as const,
            {
              address: badgeTokenAddress,
              abi: badgeTokenAbi,
              functionName: "hasRole",
              args: [pauserRole, address],
            } as const,
          ]
        : [],
    query: { enabled: Boolean(defaultAdminRole && minterRole && pauserRole && address) },
  });

  return {
    isConnected,
    isAdmin: hasRoleResults?.[0]?.result === true,
    isMinter: hasRoleResults?.[1]?.result === true,
    isPauser: hasRoleResults?.[2]?.result === true,
    defaultAdminRole,
    minterRole,
    pauserRole,
  };
}
