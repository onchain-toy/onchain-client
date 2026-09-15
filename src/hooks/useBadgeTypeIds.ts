import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { badgeTokenAbi, badgeTokenAddress } from "../contracts/badgeToken";

export interface BadgeTypeInfo {
  id: bigint;
  uri: string;
  transferable: boolean;
}

const BATCH_SIZE = 10n;
const SAFETY_CAP = 500; // guards against an infinite loop if something's off

// Badge ids are never enumerable through an on-chain "list all ids" function,
// and scanning BadgeTypeCreated logs via eth_getLogs hits free-tier public
// RPC lookback limits once the chain has moved on from the deployment block
// (confirmed against polygon-amoy.drpc.org: "ranges over 10000 blocks are
// not supported on free plan", triggered by fromBlock's *age*, not the
// range width). Since ids are assigned sequentially starting at 1
// (createBadgeType's `_nextBadgeId++`), we can instead just probe id 1, 2,
// 3... via plain eth_call (batched through multicall3) until the first one
// reverts with BadgeTypeDoesNotExist - no log scanning involved at all.
export function useBadgeTypeIds() {
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["badgeTypeIds", publicClient?.chain.id],
    enabled: Boolean(publicClient),
    queryFn: async (): Promise<BadgeTypeInfo[]> => {
      const client = publicClient!;
      const found: BadgeTypeInfo[] = [];
      let nextId = 1n;

      while (found.length < SAFETY_CAP) {
        const idsToTry = Array.from({ length: Number(BATCH_SIZE) }, (_, i) => nextId + BigInt(i));

        const [uriResults, transferableResults] = await Promise.all([
          client.multicall({
            contracts: idsToTry.map(
              (id) =>
                ({
                  address: badgeTokenAddress,
                  abi: badgeTokenAbi,
                  functionName: "uri",
                  args: [id],
                }) as const,
            ),
            allowFailure: true,
          }),
          client.multicall({
            contracts: idsToTry.map(
              (id) =>
                ({
                  address: badgeTokenAddress,
                  abi: badgeTokenAbi,
                  functionName: "isTransferable",
                  args: [id],
                }) as const,
            ),
            allowFailure: true,
          }),
        ]);

        let hitEnd = false;
        for (let i = 0; i < idsToTry.length; i++) {
          const uriResult = uriResults[i];
          const transferableResult = transferableResults[i];
          if (uriResult.status === "success" && transferableResult.status === "success") {
            found.push({
              id: idsToTry[i],
              uri: uriResult.result as string,
              transferable: transferableResult.result as boolean,
            });
          } else {
            hitEnd = true;
            break;
          }
        }

        if (hitEnd) break;
        nextId += BATCH_SIZE;
      }

      return found;
    },
    staleTime: 30_000,
  });
}
