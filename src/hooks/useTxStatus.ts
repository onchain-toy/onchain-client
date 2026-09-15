import { useEffect, useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import {
  BaseError,
  ContractFunctionRevertedError,
  UserRejectedRequestError,
  decodeFunctionData,
  type TransactionReceipt,
} from "viem";
import { badgeTokenAbi } from "../contracts/badgeToken";

export type TxPhase = "idle" | "pending" | "confirmed" | "failed" | "rejected";

export interface TxStatus {
  phase: TxPhase;
  message: string;
}

// Wraps a single write-contract call and derives the 4 UI states the
// assignment asks for: 대기(pending) -> 확정(confirmed) / 실패(failed) / 사용자
// 거절(rejected). "pending" covers both "waiting for the wallet signature"
// and "waiting for on-chain confirmation" - both are shown as one phase with
// a different message, since the assignment's state machine only has 4 slots.
export function useTxStatus() {
  const { writeContract, data: hash, error: writeError, isPending: isSigning, reset } = useWriteContract();
  const {
    data: watchedReceipt,
    error: receiptError,
    isLoading: isConfirming,
  } = useWaitForTransactionReceipt({ hash });
  // Amoy's public RPCs have repeatedly proven flaky mid-session (log range
  // caps, gas caps, minimum fee rejections) - polling for the receipt is
  // just as susceptible. When the watch-based hook above gives up, fall
  // back to directly asking for the receipt a few times before admitting
  // defeat, instead of surfacing a dead end while Polygonscan shows the
  // real (and often perfectly normal - e.g. an expected revert) outcome.
  const { receipt: fallbackReceipt, exhausted: fallbackExhausted } = useFallbackReceipt(
    hash,
    Boolean(receiptError),
  );
  const receiptData = watchedReceipt ?? fallbackReceipt;
  const revertReason = useRevertReason(hash, receiptData);

  let status: TxStatus = { phase: "idle", message: "" };

  if (writeError) {
    if (isUserRejection(writeError)) {
      status = { phase: "rejected", message: "지갑에서 서명을 거절했습니다." };
    } else {
      // Every viem/wagmi error is a BaseError, so preferring its own
      // .shortMessage here would almost always win over a Korean fallback,
      // leaking raw (and often generic/unhelpful, e.g. "Execution reverted
      // for an unknown reason.") English text into the UI. Try to decode
      // our own custom error out of it instead; fall back to a plain
      // Korean message only if that fails.
      const reason = decodeRevertReason(writeError);
      status = {
        phase: "failed",
        message: reason ? `컨트랙트가 거부했습니다: ${reason}` : "트랜잭션이 거부되었습니다 (지갑 또는 컨트랙트에서 실패).",
      };
    }
  } else if (isSigning) {
    status = { phase: "pending", message: "지갑에서 서명을 확인해주세요..." };
  } else if (hash && isConfirming) {
    status = { phase: "pending", message: "트랜잭션 컨펌을 기다리는 중..." };
  } else if (receiptData) {
    if (receiptData.status === "success") {
      status = { phase: "confirmed", message: "트랜잭션이 확정되었습니다." };
    } else {
      status = {
        phase: "failed",
        message: revertReason ? `온체인에서 실패(revert): ${revertReason}` : "온체인에서 실패(revert)했습니다 (원인 확인 중...).",
      };
    }
  } else if (receiptError) {
    status = fallbackExhausted
      ? { phase: "failed", message: "트랜잭션 확인 중 오류가 발생했습니다 (Polygonscan에서 직접 확인해주세요)." }
      : { phase: "pending", message: "트랜잭션 확인을 재시도하는 중..." };
  }

  return { write: writeContract, hash, status, reset };
}

const FALLBACK_ATTEMPTS = 5;
const FALLBACK_DELAY_MS = 2_000;

// wagmi's useWaitForTransactionReceipt gives up on transient RPC errors
// (seen repeatedly on Amoy's public nodes this session) even when the tx
// actually did mine. Once it errors, poll for the receipt directly a few
// times before treating it as a real failure.
function useFallbackReceipt(hash: `0x${string}` | undefined, shouldFetch: boolean) {
  const publicClient = usePublicClient();
  const [result, setResult] = useState<{ hash?: string; receipt?: TransactionReceipt; exhausted: boolean }>({
    exhausted: false,
  });

  useEffect(() => {
    if (!publicClient || !hash || !shouldFetch) return;

    let cancelled = false;
    (async () => {
      for (let attempt = 0; attempt < FALLBACK_ATTEMPTS; attempt++) {
        if (cancelled) return;
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash });
          if (!cancelled) setResult({ hash, receipt, exhausted: false });
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, FALLBACK_DELAY_MS));
        }
      }
      if (!cancelled) setResult({ hash, exhausted: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, hash, shouldFetch]);

  return result.hash === hash ? result : { exhausted: false };
}

// A mined-but-reverted receipt doesn't carry the decoded revert reason by
// itself - getting it means replaying the same call against the block it
// failed in and reading the error out of *that*.
function useRevertReason(hash: `0x${string}` | undefined, receiptData: TransactionReceipt | undefined) {
  const publicClient = usePublicClient();
  // Keyed by hash so a stale reason from a previous tx is never shown for
  // the current one - read-time comparison below, no separate "reset"
  // setState call needed inside the effect.
  const [result, setResult] = useState<{ hash?: string; reason: string | null }>({ reason: null });

  useEffect(() => {
    if (!publicClient || !hash || !receiptData || receiptData.status !== "reverted") return;

    let cancelled = false;
    (async () => {
      try {
        const tx = await publicClient.getTransaction({ hash });
        const decoded = decodeFunctionData({ abi: badgeTokenAbi, data: tx.input });
        const params = {
          address: tx.to!,
          abi: badgeTokenAbi,
          functionName: decoded.functionName,
          args: decoded.args,
          account: tx.from,
          blockNumber: receiptData.blockNumber,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- functionName/args pair is only known at runtime here
        } as any;
        await publicClient.simulateContract(params);
        if (!cancelled) setResult({ hash, reason: null });
      } catch (err) {
        if (!cancelled) setResult({ hash, reason: decodeRevertReason(err as Error) });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, hash, receiptData]);

  return result.hash === hash ? result.reason : null;
}

function isUserRejection(error: Error): boolean {
  return error instanceof BaseError
    ? error.walk((e) => e instanceof UserRejectedRequestError) !== null
    : false;
}

function decodeRevertReason(error: Error): string | null {
  if (!(error instanceof BaseError)) return null;
  const revertError = error.walk((e) => e instanceof ContractFunctionRevertedError) as
    | ContractFunctionRevertedError
    | null;
  if (!revertError) return null;

  const errorName = revertError.data?.errorName;
  if (!errorName) return revertError.reason ?? null;

  const args = revertError.data?.args;
  return args && args.length > 0 ? `${errorName}(${args.map(String).join(", ")})` : errorName;
}
