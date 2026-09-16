import { useState, type ReactElement } from "react";
import { useReadContract } from "wagmi";
import { badgeTokenAbi, badgeTokenAddress } from "../contracts/badgeToken";
import { useAdminAccess } from "../hooks/useAdminAccess";
import { useRefetchOnConfirm } from "../hooks/useRefetchOnConfirm";
import { useTxStatus } from "../hooks/useTxStatus";
import { GAS_FEES } from "../lib/gasFees";
import { TxStatusBanner } from "./TxStatusBanner";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// Only ever mounted (see App.tsx) once useAdminAccess() has already
// confirmed the connected wallet holds at least one of these roles.
export function AdminPanel() {
  const { isAdmin, isMinter, isPauser } = useAdminAccess();

  const sections = [
    isAdmin && <CreateBadgeTypeForm key="create" />,
    isAdmin && <RoleManagementForm key="roles" />,
    isPauser && <PauserControls key="pauser" />,
    isMinter && <MintForm key="mint" />,
  ].filter((section): section is ReactElement => Boolean(section));

  return (
    <div>
      {sections.map((section, i) => (
        <div key={i}>
          {i > 0 && <div className="card-section" />}
          {section}
        </div>
      ))}
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
      className="form"
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
      <h3 className="form-title">새 배지 타입 등록 (admin)</h3>
      <label className="field">
        메타데이터 URI
        <input value={uri} onChange={(e) => setUri(e.target.value)} placeholder="https://.../1.json" required />
      </label>
      <label className="field checkbox-field">
        <input type="checkbox" checked={transferable} onChange={(e) => setTransferable(e.target.checked)} />
        전송 가능(transferable)
      </label>
      <div>
        <button type="submit" className="btn btn-primary" disabled={status.phase === "pending"}>
          등록
        </button>
      </div>
      <TxStatusBanner status={status} hash={hash} />
    </form>
  );
}

const ROLE_LABELS = {
  MINTER: "민터 (MINTER_ROLE)",
  PAUSER: "퍼서 (PAUSER_ROLE)",
} as const;

function RoleManagementForm() {
  const { minterRole, pauserRole } = useAdminAccess();
  const [account, setAccount] = useState("");
  const [role, setRole] = useState<keyof typeof ROLE_LABELS>("MINTER");
  const { write, hash, status } = useTxStatus();
  useRefetchOnConfirm(status.phase);

  const roleHash = role === "MINTER" ? minterRole : pauserRole;
  const disabled = !account || !roleHash || status.phase === "pending";

  function submit(functionName: "grantRole" | "revokeRole") {
    if (!roleHash || !account) return;
    write({
      address: badgeTokenAddress,
      abi: badgeTokenAbi,
      functionName,
      args: [roleHash, account as `0x${string}`],
      ...GAS_FEES,
    });
  }

  return (
    <div className="form">
      <h3 className="form-title">역할 관리 (admin)</h3>
      <label className="field">
        대상 주소
        <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="0x..." />
      </label>
      <label className="field">
        역할
        <select value={role} onChange={(e) => setRole(e.target.value as keyof typeof ROLE_LABELS)}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="field-row">
        <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => submit("grantRole")}>
          부여
        </button>
        <button type="button" className="btn" disabled={disabled} onClick={() => submit("revokeRole")}>
          회수
        </button>
      </div>
      <TxStatusBanner status={status} hash={hash} />
    </div>
  );
}

function PauserControls() {
  const { data: paused } = useReadContract({
    address: badgeTokenAddress,
    abi: badgeTokenAbi,
    functionName: "paused",
  });
  const { write, hash, status } = useTxStatus();
  useRefetchOnConfirm(status.phase);

  return (
    <div className="form">
      <h3 className="form-title">일시정지 관리 (pauser)</h3>
      <p className="hint-text">
        현재 상태:{" "}
        <span className={paused ? "transferable-no" : "transferable-yes"}>
          {paused === undefined ? "확인 중..." : paused ? "일시정지됨" : "정상 운영"}
        </span>
      </p>
      <div className="field-row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={paused !== false || status.phase === "pending"}
          onClick={() =>
            write({ address: badgeTokenAddress, abi: badgeTokenAbi, functionName: "pause", ...GAS_FEES })
          }
        >
          일시정지
        </button>
        <button
          type="button"
          className="btn"
          disabled={paused !== true || status.phase === "pending"}
          onClick={() =>
            write({ address: badgeTokenAddress, abi: badgeTokenAbi, functionName: "unpause", ...GAS_FEES })
          }
        >
          재개
        </button>
      </div>
      <TxStatusBanner status={status} hash={hash} />
    </div>
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
      className="form"
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
      <h3 className="form-title">배지 민팅 (minter)</h3>
      <label className="field">
        받는 주소
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." required />
      </label>
      <div className="field-row">
        <label className="field">
          배지 id
          <input value={id} onChange={(e) => setId(e.target.value)} type="number" min="1" required />
        </label>
        <label className="field">
          수량
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" required />
        </label>
      </div>
      <div>
        <button type="submit" className="btn btn-primary" disabled={status.phase === "pending"}>
          민팅
        </button>
      </div>
      <TxStatusBanner status={status} hash={hash} />
    </form>
  );
}
