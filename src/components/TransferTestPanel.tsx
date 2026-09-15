import { useState } from "react";
import { useAccount } from "wagmi";
import { badgeTokenAbi, badgeTokenAddress } from "../contracts/badgeToken";
import { useRefetchOnConfirm } from "../hooks/useRefetchOnConfirm";
import { useTxStatus } from "../hooks/useTxStatus";
import { GAS_FEES } from "../lib/gasFees";
import { TxStatusBanner } from "./TxStatusBanner";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// Lets any connected wallet (not just admin/minter) try to break the
// transfer/approval block, straight from the UI - the same thing that was
// being tested manually through Polygonscan's Write Contract tab, but
// without fighting the wallet's gas auto-estimation for a call that's
// expected to revert (see lib/gasFees.ts).
export function TransferTestPanel() {
  const { isConnected } = useAccount();
  if (!isConnected) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <TransferAttemptForm />
      <ApprovalAttemptForm />
    </div>
  );
}

function TransferAttemptForm() {
  const { address } = useAccount();
  const [to, setTo] = useState("");
  const [id, setId] = useState("");
  const [amount, setAmount] = useState("1");
  const { write, hash, status } = useTxStatus();
  useRefetchOnConfirm(status.phase);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        write({
          address: badgeTokenAddress,
          abi: badgeTokenAbi,
          functionName: "safeTransferFrom",
          args: [
            address ?? ZERO_ADDRESS,
            (to || ZERO_ADDRESS) as `0x${string}`,
            BigInt(id || 0),
            BigInt(amount || 0),
            "0x",
          ],
          ...GAS_FEES,
        });
      }}
    >
      <h3>전송 시도 (내 배지를 다른 주소로)</h3>
      <label>
        받는 주소 <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." required />
      </label>
      <label style={{ marginLeft: 12 }}>
        배지 id <input value={id} onChange={(e) => setId(e.target.value)} type="number" min="1" required style={{ width: 80 }} />
      </label>
      <label style={{ marginLeft: 12 }}>
        수량 <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" required style={{ width: 80 }} />
      </label>
      <button type="submit" style={{ marginLeft: 12 }} disabled={status.phase === "pending"}>
        전송 시도
      </button>
      <p style={{ color: "#666", fontSize: 13 }}>
        transferable=false인 배지면 <code>BadgeNotTransferable</code>로 revert되는 게 정상입니다.
      </p>
      <TxStatusBanner status={status} hash={hash} />
    </form>
  );
}

function ApprovalAttemptForm() {
  const [operator, setOperator] = useState("");
  const { write, hash, status } = useTxStatus();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        write({
          address: badgeTokenAddress,
          abi: badgeTokenAbi,
          functionName: "setApprovalForAll",
          args: [(operator || ZERO_ADDRESS) as `0x${string}`, true],
          ...GAS_FEES,
        });
      }}
    >
      <h3>승인(operator approval) 시도</h3>
      <label>
        operator 주소 <input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="0x..." required />
      </label>
      <button type="submit" style={{ marginLeft: 12 }} disabled={status.phase === "pending"}>
        승인 시도
      </button>
      <p style={{ color: "#666", fontSize: 13 }}>
        이 컨트랙트는 승인 자체를 전면 차단합니다 — 항상 <code>ApprovalNotAllowed</code>로 revert되는 게 정상입니다.
      </p>
      <TxStatusBanner status={status} hash={hash} />
    </form>
  );
}
