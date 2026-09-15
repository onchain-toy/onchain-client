import type { CSSProperties } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { badgeTokenAbi, badgeTokenAddress } from "../contracts/badgeToken";
import { useBadgeTypeIds } from "../hooks/useBadgeTypeIds";

export function BadgeList() {
  const { address, isConnected } = useAccount();
  const { data: badgeTypes, isLoading, error } = useBadgeTypeIds();

  const { data: balances } = useReadContracts({
    contracts:
      badgeTypes?.map(
        (b) =>
          ({
            address: badgeTokenAddress,
            abi: badgeTokenAbi,
            functionName: "balanceOf",
            args: [address ?? "0x0000000000000000000000000000000000000000", b.id],
          }) as const,
      ) ?? [],
    query: { enabled: Boolean(isConnected && badgeTypes?.length) },
  });

  if (isLoading) return <p>배지 목록을 불러오는 중...</p>;
  if (error) return <p style={{ color: "#b3261e" }}>배지 목록을 불러오지 못했습니다: {error.message}</p>;
  if (!badgeTypes?.length) return <p>아직 등록된 배지 종류가 없습니다.</p>;

  return (
    <table style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <th style={cellStyle}>id</th>
          <th style={cellStyle}>URI</th>
          <th style={cellStyle}>전송 가능?</th>
          {isConnected && <th style={cellStyle}>내 보유량</th>}
        </tr>
      </thead>
      <tbody>
        {badgeTypes.map((b, i) => {
          const balance = balances?.[i]?.result as bigint | undefined;
          return (
            <tr key={b.id.toString()}>
              <td style={cellStyle}>{b.id.toString()}</td>
              <td style={cellStyle}>{b.uri}</td>
              <td style={cellStyle}>{b.transferable ? "가능" : "불가"}</td>
              {isConnected && <td style={cellStyle}>{balance?.toString() ?? "-"}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const cellStyle: CSSProperties = {
  border: "1px solid #ddd",
  padding: "6px 10px",
  textAlign: "left",
};
