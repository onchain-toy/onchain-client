import { useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { badgeTokenAbi, badgeTokenAddress } from "../contracts/badgeToken";
import { useRefetchOnConfirm } from "../hooks/useRefetchOnConfirm";
import { useTxStatus } from "../hooks/useTxStatus";
import { GAS_FEES } from "../lib/gasFees";
import { TxStatusBanner } from "./TxStatusBanner";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export function AdminPanel() {
  const { address, isConnected } = useAccount();

  const { data: roles } = useReadContracts({
    contracts: [
      {
        address: badgeTokenAddress,
        abi: badgeTokenAbi,
        functionName: "DEFAULT_ADMIN_ROLE",
      } as const,
      {
        address: badgeTokenAddress,
        abi: badgeTokenAbi,
        functionName: "MINTER_ROLE",
      } as const,
    ],
    query: { enabled: isConnected },
  });

  const defaultAdminRole = roles?.[0]?.result as `0x${string}` | undefined;
  const minterRole = roles?.[1]?.result as `0x${string}` | undefined;

  const { data: hasRoleResults } = useReadContracts({
    contracts:
      defaultAdminRole && minterRole && address
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
          ]
        : [],
    query: { enabled: Boolean(defaultAdminRole && minterRole && address) },
  });

  const isAdmin = hasRoleResults?.[0]?.result === true;
  const isMinter = hasRoleResults?.[1]?.result === true;

  if (!isConnected) return null;
  if (!isAdmin && !isMinter) {
    return <p>이 지갑은 관리자(admin)도, 민터(minter)도 아닙니다.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {isAdmin && <CreateBadgeTypeForm />}
      {isMinter && <MintForm />}
    </div>
  );
}

function CreateBadgeTypeForm() {
  const [uri, setUri] = useState("");
  const [transferable, setTransferable] = useState(false);
  const { write, hash, status } = useTxStatus();
  useRefetchOnConfirm(status.phase);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        write({
          address: badgeTokenAddress,
          abi: badgeTokenAbi,
          functionName: "createBadgeType",
          args: [uri, transferable],
          ...GAS_FEES,
        });
      }}
    >
      <h3>새 배지 타입 등록 (admin)</h3>
      <label>
        메타데이터 URI{" "}
        <input value={uri} onChange={(e) => setUri(e.target.value)} placeholder="https://.../1.json" required />
      </label>
      <label style={{ marginLeft: 12 }}>
        <input type="checkbox" checked={transferable} onChange={(e) => setTransferable(e.target.checked)} />
        전송 가능(transferable)
      </label>
      <button type="submit" style={{ marginLeft: 12 }} disabled={status.phase === "pending"}>
        등록
      </button>
      <TxStatusBanner status={status} hash={hash} />
    </form>
  );
}

function MintForm() {
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
          functionName: "mint",
          args: [(to || ZERO_ADDRESS) as `0x${string}`, BigInt(id || 0), BigInt(amount || 0), "0x"],
          ...GAS_FEES,
        });
      }}
    >
      <h3>배지 민팅 (minter)</h3>
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
        민팅
      </button>
      <TxStatusBanner status={status} hash={hash} />
    </form>
  );
}
