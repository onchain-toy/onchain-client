import type { TxStatus } from "../hooks/useTxStatus";

const COLORS: Record<TxStatus["phase"], string> = {
  idle: "transparent",
  pending: "#8a6d00",
  confirmed: "#1a7a3a",
  failed: "#b3261e",
  rejected: "#5b5b5b",
};

const BACKGROUNDS: Record<TxStatus["phase"], string> = {
  idle: "transparent",
  pending: "#fff8e1",
  confirmed: "#e6f4ea",
  failed: "#fdecea",
  rejected: "#f0f0f0",
};

export function TxStatusBanner({ status, hash }: { status: TxStatus; hash?: `0x${string}` }) {
  if (status.phase === "idle") return null;

  return (
    <div
      style={{
        marginTop: 8,
        padding: "8px 12px",
        borderRadius: 6,
        color: COLORS[status.phase],
        background: BACKGROUNDS[status.phase],
        fontSize: 14,
      }}
    >
      <div>{status.message}</div>
      {hash && (
        <a
          href={`https://amoy.polygonscan.com/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          Polygonscan에서 보기
        </a>
      )}
    </div>
  );
}
