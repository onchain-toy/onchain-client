import { useAccount, useReadContracts } from "wagmi";
import { badgeTokenAbi, badgeTokenAddress } from "../contracts/badgeToken";
import { useBadgeTypeIds } from "../hooks/useBadgeTypeIds";
import { useBadgeMetadataList } from "../hooks/useBadgeMetadata";

export function BadgeList() {
  const { address, isConnected } = useAccount();
  const { data: badgeTypes, isLoading, error } = useBadgeTypeIds();
  const metadataResults = useBadgeMetadataList(badgeTypes);

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

  if (isLoading) {
    return (
      <div>
        <div className="skeleton-stat-row">
          <div className="skeleton skeleton-stat-block" />
          {isConnected && <div className="skeleton skeleton-stat-block" />}
        </div>
        <div className="table-wrap">
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
          <div className="skeleton skeleton-row" />
        </div>
      </div>
    );
  }
  if (error) return <p className="error-text">배지 목록을 불러오지 못했습니다: {error.message}</p>;
  if (!badgeTypes?.length) return <p className="hint-text">아직 등록된 배지 종류가 없습니다.</p>;

  const heldCount = balances?.filter((r) => ((r.result as bigint | undefined) ?? 0n) > 0n).length ?? 0;

  return (
    <div className="fade-in">
      <div className="stat-row">
        <div className="stat-block">
          <span className="stat-label">등록된 배지 종류</span>
          <span className="stat-value">{badgeTypes.length}</span>
        </div>
        {isConnected && (
          <div className="stat-block">
            <span className="stat-label">내가 보유한 종류</span>
            <span className="stat-value">{heldCount}</span>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>id</th>
              <th>이미지</th>
              <th>배지</th>
              <th>전송 가능?</th>
              {isConnected && <th>내 보유량</th>}
            </tr>
          </thead>
          <tbody>
            {badgeTypes.map((b, i) => {
              const balance = balances?.[i]?.result as bigint | undefined;
              const metadata = metadataResults[i]?.data;
              const imageLoading = metadataResults[i]?.isLoading;
              return (
                <tr key={b.id.toString()}>
                  <td className="id-cell">#{b.id.toString()}</td>
                  <td>
                    <div className="badge-thumb">
                      {metadata?.image ? (
                        <img src={metadata.image} alt={metadata.name ?? `Badge #${b.id}`} loading="lazy" />
                      ) : (
                        <span className="badge-thumb-fallback">{imageLoading ? "…" : "–"}</span>
                      )}
                    </div>
                  </td>
                  <td className="badge-name-cell">
                    <span className="badge-name">{metadata?.name ?? `Badge #${b.id.toString()}`}</span>
                    <a className="uri-cell" href={b.uri} target="_blank" rel="noreferrer">
                      메타데이터 보기 ↗
                    </a>
                  </td>
                  <td>
                    <span className={b.transferable ? "transferable-yes" : "transferable-no"}>
                      {b.transferable ? "가능" : "불가"}
                    </span>
                  </td>
                  {isConnected && <td className="balance-cell">{balance?.toString() ?? "-"}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
