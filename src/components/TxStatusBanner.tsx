import type { TxStatus } from "../hooks/useTxStatus";

const VARIANT: Record<TxStatus["phase"], string> = {
  idle: "",
  pending: "banner-warning",
  confirmed: "banner-success",
  failed: "banner-danger",
  rejected: "banner-neutral",
};

export function TxStatusBanner({ status, hash }: { status: TxStatus; hash?: `0x${string}` }) {
  if (status.phase === "idle") return null;

  return (
    <div className={`banner ${VARIANT[status.phase]}`}>
      <span>{status.message}</span>
      {hash && (
        <a href={`https://amoy.polygonscan.com/tx/${hash}`} target="_blank" rel="noreferrer">
          Polygonscan에서 보기
        </a>
      )}
    </div>
  );
}
