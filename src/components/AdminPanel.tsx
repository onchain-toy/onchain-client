import { useState, type ReactElement } from "react";
import { useReadContract } from "wagmi";
import { badgeTokenAbi, badgeTokenAddress } from "../contracts/badgeToken";
import { useAdminAccess } from "../hooks/useAdminAccess";
import { useMetadataPreview } from "../hooks/useMetadataPreview";
import { useRefetchOnConfirm } from "../hooks/useRefetchOnConfirm";
import { useTxStatus } from "../hooks/useTxStatus";
import { isValidAddressInput } from "../lib/address";
import { GAS_FEES } from "../lib/gasFees";
import { parseBigIntList } from "../lib/parseList";
import { useUnusedMetadataFiles } from "../hooks/useUnusedMetadata";
import { ButtonSpinner, TxStatusBanner } from "./TxStatusBanner";

// Only ever mounted (see App.tsx) once useAdminAccess() has already
// confirmed the connected wallet holds at least one of these roles.
export function AdminPanel() {
  const { isAdmin, isMinter, isPauser } = useAdminAccess();

  const sections = [
    isAdmin && <CreateBadgeTypeForm key="create" />,
    isAdmin && <UnusedMetadataChecklist key="unused" />,
    isAdmin && <TransferableToggleForm key="toggle" />,
    isAdmin && <RoleManagementForm key="roles" />,
    isPauser && <PauserControls key="pauser" />,
    isMinter && <MintForm key="mint" />,
    isMinter && <MintBatchForm key="mintBatch" />,
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

  const preview = useMetadataPreview(uri);
  const canSubmit = preview.isValid && status.phase !== "pending";

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!preview.isValid) return;
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

      {!preview.isEmpty && (
        <div className={`uri-preview ${preview.isInvalid ? "uri-preview-invalid" : ""}`}>
          {preview.isChecking && <span className="hint-text">메타데이터 확인 중...</span>}
          {preview.isInvalid && (
            <span className="error-text">
              이 URL에서 올바른 메타데이터(name/image 포함된 JSON)를 불러오지 못했습니다. 오타는 아닌지 확인해주세요 —
              등록하면 나중에 고칠 수 없습니다.
            </span>
          )}
          {preview.isValid && (
            <>
              <div className="badge-thumb">
                <img src={preview.data?.image} alt={preview.data?.name} />
              </div>
              <span className="uri-preview-name">{preview.data?.name}</span>
            </>
          )}
        </div>
      )}

      <label className="field checkbox-field">
        <input type="checkbox" checked={transferable} onChange={(e) => setTransferable(e.target.checked)} />
        전송 가능(transferable)
      </label>
      <div>
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {status.phase === "pending" && <ButtonSpinner />}
          등록
        </button>
      </div>
      <TxStatusBanner status={status} hash={hash} />
    </form>
  );
}

function UnusedMetadataChecklist() {
  const { isLoading, error, files } = useUnusedMetadataFiles();

  return (
    <div className="form">
      <h3 className="form-title">미사용 메타데이터 체크리스트 (admin 참고용)</h3>
      {isLoading && <p className="hint-text">저장소 확인 중...</p>}
      {error && <p className="error-text">metadata 저장소 목록을 불러오지 못했습니다.</p>}

      {!isLoading && !error && files.length === 0 && (
        <p className="hint-text">미사용 파일이 없습니다.</p>
      )}

      {files.length > 0 && (
        <div className="checklist">
          {files.map((f) => (
            <div className="checklist-item" key={f.name}>
              <div className="badge-thumb">
                {f.metadata?.image ? (
                  <img src={f.metadata.image} alt={f.metadata?.name ?? f.name} loading="lazy" />
                ) : (
                  <span className="badge-thumb-fallback">?</span>
                )}
              </div>
              <div className="badge-name-cell">
                <span className="badge-name">{f.metadata?.name ?? f.name}</span>
                <a className="uri-cell" href={f.url} target="_blank" rel="noreferrer">
                  {f.name}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransferableToggleForm() {
  const [id, setId] = useState("");
  const [transferable, setTransferable] = useState(false);
  const { write, hash, status } = useTxStatus();
  useRefetchOnConfirm(status.phase);

  const idBigInt = id ? BigInt(id) : undefined;
  const {
    data: currentState,
    error: readError,
    isFetching: isReadingState,
  } = useReadContract({
    address: badgeTokenAddress,
    abi: badgeTokenAbi,
    functionName: "isTransferable",
    args: idBigInt !== undefined ? [idBigInt] : undefined,
    query: { enabled: idBigInt !== undefined },
  });

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (idBigInt === undefined) return;
        write({
          address: badgeTokenAddress,
          abi: badgeTokenAbi,
          functionName: "setTransferable",
          args: [idBigInt, transferable],
          ...GAS_FEES,
        });
      }}
    >
      <h3 className="form-title">전송 가능 여부 토글 (admin)</h3>
      <label className="field">
        배지 id
        <input value={id} onChange={(e) => setId(e.target.value)} type="number" min="1" step="1" required />
      </label>
      {idBigInt !== undefined && (
        <p className="hint-text">
          현재 상태:{" "}
          {readError ? (
            <span className="error-text">등록되지 않은 id입니다.</span>
          ) : isReadingState ? (
            "확인 중..."
          ) : (
            <span className={currentState ? "transferable-yes" : "transferable-no"}>
              {currentState ? "가능" : "불가"}
            </span>
          )}
        </p>
      )}
      <label className="field checkbox-field">
        <input type="checkbox" checked={transferable} onChange={(e) => setTransferable(e.target.checked)} />
        전송 가능으로 설정
      </label>
      <div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={idBigInt === undefined || status.phase === "pending"}
        >
          {status.phase === "pending" && <ButtonSpinner />}
          적용
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
  const addressInvalid = account.length > 0 && !isValidAddressInput(account);
  const disabled = !isValidAddressInput(account) || !roleHash || status.phase === "pending";

  function submit(functionName: "grantRole" | "revokeRole") {
    if (!roleHash || !isValidAddressInput(account)) return;
    write({
      address: badgeTokenAddress,
      abi: badgeTokenAbi,
      functionName,
      args: [roleHash, account.trim() as `0x${string}`],
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
      {addressInvalid && <p className="error-text">올바른 주소 형식이 아닙니다 (0x로 시작하는 40자리 16진수).</p>}
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
          {status.phase === "pending" && <ButtonSpinner />}
          부여
        </button>
        <button type="button" className="btn" disabled={disabled} onClick={() => submit("revokeRole")}>
          {status.phase === "pending" && <ButtonSpinner />}
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
          {status.phase === "pending" && <ButtonSpinner />}
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
          {status.phase === "pending" && <ButtonSpinner />}
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

  const toInvalid = to.length > 0 && !isValidAddressInput(to);
  const canSubmit = isValidAddressInput(to) && status.phase !== "pending";

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!isValidAddressInput(to)) return;
        write({
          address: badgeTokenAddress,
          abi: badgeTokenAbi,
          functionName: "mint",
          args: [to.trim() as `0x${string}`, BigInt(id || 0), BigInt(amount || 0), "0x"],
          ...GAS_FEES,
        });
      }}
    >
      <h3 className="form-title">배지 민팅 (minter)</h3>
      <label className="field">
        받는 주소
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." required />
      </label>
      {toInvalid && <p className="error-text">올바른 주소 형식이 아닙니다 (0x로 시작하는 40자리 16진수).</p>}
      <div className="field-row">
        <label className="field">
          배지 id
          <input value={id} onChange={(e) => setId(e.target.value)} type="number" min="1" step="1" required />
        </label>
        <label className="field">
          수량
          <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" step="1" required />
        </label>
      </div>
      <div>
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {status.phase === "pending" && <ButtonSpinner />}
          민팅
        </button>
      </div>
      <TxStatusBanner status={status} hash={hash} />
    </form>
  );
}

function MintBatchForm() {
  const [to, setTo] = useState("");
  const [ids, setIds] = useState("");
  const [amounts, setAmounts] = useState("");
  const { write, hash, status } = useTxStatus();
  useRefetchOnConfirm(status.phase);

  const toInvalid = to.length > 0 && !isValidAddressInput(to);
  const idList = parseBigIntList(ids);
  const amountList = parseBigIntList(amounts);
  const listsInvalid = idList === null || amountList === null;
  const lengthMismatch =
    idList !== null && amountList !== null && idList.length > 0 && idList.length !== amountList.length;
  const canSubmit =
    isValidAddressInput(to) &&
    idList !== null &&
    amountList !== null &&
    idList.length > 0 &&
    idList.length === amountList.length &&
    status.phase !== "pending";

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit || idList === null || amountList === null) return;
        write({
          address: badgeTokenAddress,
          abi: badgeTokenAbi,
          functionName: "mintBatch",
          args: [to.trim() as `0x${string}`, idList, amountList, "0x"],
          ...GAS_FEES,
        });
      }}
    >
      <h3 className="form-title">배지 일괄 민팅 (minter)</h3>
      <label className="field">
        받는 주소
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." required />
      </label>
      {toInvalid && <p className="error-text">올바른 주소 형식이 아닙니다 (0x로 시작하는 40자리 16진수).</p>}
      <label className="field">
        배지 id 목록 (쉼표로 구분)
        <input value={ids} onChange={(e) => setIds(e.target.value)} placeholder="1, 2, 3" required />
      </label>
      <label className="field">
        수량 목록 (쉼표로 구분, id와 같은 순서·개수)
        <input value={amounts} onChange={(e) => setAmounts(e.target.value)} placeholder="5, 10, 2" required />
      </label>
      {listsInvalid && <p className="error-text">숫자와 쉼표만 입력해주세요 (예: 1, 2, 3).</p>}
      {lengthMismatch && (
        <p className="error-text">
          id 개수({idList?.length})와 수량 개수({amountList?.length})가 다릅니다.
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
          {status.phase === "pending" && <ButtonSpinner />}
          일괄 민팅
        </button>
      </div>
      <TxStatusBanner status={status} hash={hash} />
    </form>
  );
}
