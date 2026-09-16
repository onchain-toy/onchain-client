import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { polygonAmoy } from "wagmi/chains";

export function WalletBar() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching, error: switchError } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== polygonAmoy.id;

  if (!isConnected) {
    const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
    return (
      <div className="wallet-bar">
        <button
          className="btn btn-primary"
          onClick={() => injected && connect({ connector: injected })}
          disabled={isConnecting || !injected}
        >
          {isConnecting ? "연결 중..." : "지갑 연결"}
        </button>
        {!injected && (
          <p className="error-text">
            브라우저에 지갑 확장 프로그램(MetaMask 등)이 감지되지 않습니다.
          </p>
        )}
        {connectError && (
          <p className="error-text">
            {connectError.message.includes("Provider not found")
              ? "지갑 확장 프로그램을 찾을 수 없습니다. MetaMask 등을 설치한 뒤 다시 시도해주세요."
              : connectError.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
      <div className="wallet-bar">
        <span className="address-chip">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button className="btn btn-ghost" onClick={() => disconnect()}>
          연결 해제
        </button>
      </div>
      {wrongNetwork && (
        <div className="banner banner-warning" style={{ alignSelf: "stretch" }}>
          <p>지갑이 Polygon Amoy(chain id 80002)가 아닌 다른 네트워크에 연결되어 있습니다.</p>
          <div>
            <button
              className="btn btn-primary"
              onClick={() => switchChain({ chainId: polygonAmoy.id })}
              disabled={isSwitching}
            >
              {isSwitching ? "전환 중..." : "Polygon Amoy로 전환"}
            </button>
          </div>
          {switchError && <p>{switchError.message}</p>}
        </div>
      )}
    </div>
  );
}
