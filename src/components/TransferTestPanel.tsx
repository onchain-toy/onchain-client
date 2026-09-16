import { useState } from "react";
import { useAccount } from "wagmi";
import { badgeTokenAbi, badgeTokenAddress } from "../contracts/badgeToken";
import { useRefetchOnConfirm } from "../hooks/useRefetchOnConfirm";
import { useTxStatus } from "../hooks/useTxStatus";
import { isValidAddressInput } from "../lib/address";
import { GAS_FEES } from "../lib/gasFees";
import { parseBigIntList } from "../lib/parseList";
import { ButtonSpinner, TxStatusBanner } from "./TxStatusBanner";

// Lets any connected wallet (not just admin/minter) try to break the
// transfer/approval block, straight from the UI - the same thing that was
// being tested manually through Polygonscan's Write Contract tab, but
// without fighting the wallet's gas auto-estimation for a call that's
// expected to revert (see lib/gasFees.ts).
export function TransferTestPanel() {
  const { isConnected } = useAccount();
  if (!isConnected) return <p className="hint-text">테스트를 진행하려면 지갑을 연결하세요.</p>;

  return (
    <div>
      <TransferAttemptForm />
      <div className="card-section" />
      <BatchTransferAttemptForm />
      <div className="card-section" />
      <ApprovalAttemptForm />
      <div className="card-section" />
      <BurnAttemptForm />
      <div className="card-section" />
      <BurnBatchAttemptForm />
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

  const toInvalid = to.length > 0 && !isValidAddressInput(to);
  const canSubmit = Boolean(address) && isValidAddressInput(to) && status.phase !== "pending";

  return (
    <div className="form-stack">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!address || !isValidAddressInput(to)) return;
          write({
            address: badgeTokenAddress,
            abi: badgeTokenAbi,
            functionName: "safeTransferFrom",
            args: [address, to.trim() as `0x${string}`, BigInt(id || 0), BigInt(amount || 0), "0x"],
            ...GAS_FEES,
          });
        }}
      >
        <h3 className="form-title">전송 시도 (내 배지를 다른 주소로)</h3>
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
            전송 시도
          </button>
        </div>
      </form>
      <p className="hint-text">
        transferable=false인 배지면 <code>BadgeNotTransferable</code>로 revert되는 게 정상입니다.
      </p>
      <TxStatusBanner status={status} hash={hash} />
    </div>
  );
}

function BatchTransferAttemptForm() {
  const { address } = useAccount();
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
    Boolean(address) &&
    isValidAddressInput(to) &&
    idList !== null &&
    amountList !== null &&
    idList.length > 0 &&
    idList.length === amountList.length &&
    status.phase !== "pending";

  return (
    <div className="form-stack">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!address || !canSubmit || idList === null || amountList === null) return;
          write({
            address: badgeTokenAddress,
            abi: badgeTokenAbi,
            functionName: "safeBatchTransferFrom",
            args: [address, to.trim() as `0x${string}`, idList, amountList, "0x"],
            ...GAS_FEES,
          });
        }}
      >
        <h3 className="form-title">일괄 전송 시도 (내 배지들을 다른 주소로)</h3>
        <label className="field">
          받는 주소
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." required />
        </label>
        {toInvalid && <p className="error-text">올바른 주소 형식이 아닙니다 (0x로 시작하는 40자리 16진수).</p>}
        <label className="field">
          배지 id 목록 (쉼표로 구분)
          <input value={ids} onChange={(e) => setIds(e.target.value)} placeholder="1, 3" required />
        </label>
        <label className="field">
          수량 목록 (쉼표로 구분, id와 같은 순서·개수)
          <input value={amounts} onChange={(e) => setAmounts(e.target.value)} placeholder="1, 1" required />
        </label>
        {listsInvalid && <p className="error-text">숫자와 쉼표만 입력해주세요 (예: 1, 3).</p>}
        {lengthMismatch && (
          <p className="error-text">
            id 개수({idList?.length})와 수량 개수({amountList?.length})가 다릅니다.
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {status.phase === "pending" && <ButtonSpinner />}
            일괄 전송 시도
          </button>
        </div>
      </form>
      <p className="hint-text">
        id 목록 중 하나라도 non-transferable이면 <code>BadgeNotTransferable</code>로 배치 전체가 revert되는 게
        정상입니다 — 일부만 성공하는 경우는 없습니다.
      </p>
      <TxStatusBanner status={status} hash={hash} />
    </div>
  );
}

function ApprovalAttemptForm() {
  const [operator, setOperator] = useState("");
  const { write, hash, status } = useTxStatus();

  const operatorInvalid = operator.length > 0 && !isValidAddressInput(operator);
  const canSubmit = isValidAddressInput(operator) && status.phase !== "pending";

  return (
    <div className="form-stack">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isValidAddressInput(operator)) return;
          write({
            address: badgeTokenAddress,
            abi: badgeTokenAbi,
            functionName: "setApprovalForAll",
            args: [operator.trim() as `0x${string}`, true],
            ...GAS_FEES,
          });
        }}
      >
        <h3 className="form-title">승인(operator approval) 시도</h3>
        <label className="field">
          operator 주소
          <input value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="0x..." required />
        </label>
        {operatorInvalid && <p className="error-text">올바른 주소 형식이 아닙니다 (0x로 시작하는 40자리 16진수).</p>}
        <div>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {status.phase === "pending" && <ButtonSpinner />}
            승인 시도
          </button>
        </div>
      </form>
      <p className="hint-text">
        이 컨트랙트는 승인 자체를 전면 차단합니다 — 항상 <code>ApprovalNotAllowed</code>로 revert되는 게 정상입니다.
      </p>
      <TxStatusBanner status={status} hash={hash} />
    </div>
  );
}

function BurnAttemptForm() {
  const { address } = useAccount();
  const [id, setId] = useState("");
  const [amount, setAmount] = useState("1");
  const { write, hash, status } = useTxStatus();
  useRefetchOnConfirm(status.phase);

  const canSubmit = Boolean(address) && status.phase !== "pending";

  return (
    <div className="form-stack">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!address) return;
          write({
            address: badgeTokenAddress,
            abi: badgeTokenAbi,
            functionName: "burn",
            args: [address, BigInt(id || 0), BigInt(amount || 0)],
            ...GAS_FEES,
          });
        }}
      >
        <h3 className="form-title">소각 시도 (내 배지)</h3>
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
            소각 시도
          </button>
        </div>
      </form>
      <p className="hint-text">
        본인 소유 배지만 소각할 수 있습니다(승인이 전면 차단돼 있어 대리 소각은 불가능). <code>transferable</code>{" "}
        여부와 무관하게 항상 성공하는 게 정상입니다.
      </p>
      <TxStatusBanner status={status} hash={hash} />
    </div>
  );
}

function BurnBatchAttemptForm() {
  const { address } = useAccount();
  const [ids, setIds] = useState("");
  const [amounts, setAmounts] = useState("");
  const { write, hash, status } = useTxStatus();
  useRefetchOnConfirm(status.phase);

  const idList = parseBigIntList(ids);
  const amountList = parseBigIntList(amounts);
  const listsInvalid = idList === null || amountList === null;
  const lengthMismatch =
    idList !== null && amountList !== null && idList.length > 0 && idList.length !== amountList.length;
  const canSubmit =
    Boolean(address) &&
    idList !== null &&
    amountList !== null &&
    idList.length > 0 &&
    idList.length === amountList.length &&
    status.phase !== "pending";

  return (
    <div className="form-stack">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!address || !canSubmit || idList === null || amountList === null) return;
          write({
            address: badgeTokenAddress,
            abi: badgeTokenAbi,
            functionName: "burnBatch",
            args: [address, idList, amountList],
            ...GAS_FEES,
          });
        }}
      >
        <h3 className="form-title">일괄 소각 시도 (내 배지들)</h3>
        <label className="field">
          배지 id 목록 (쉼표로 구분)
          <input value={ids} onChange={(e) => setIds(e.target.value)} placeholder="1, 3" required />
        </label>
        <label className="field">
          수량 목록 (쉼표로 구분, id와 같은 순서·개수)
          <input value={amounts} onChange={(e) => setAmounts(e.target.value)} placeholder="1, 1" required />
        </label>
        {listsInvalid && <p className="error-text">숫자와 쉼표만 입력해주세요 (예: 1, 3).</p>}
        {lengthMismatch && (
          <p className="error-text">
            id 개수({idList?.length})와 수량 개수({amountList?.length})가 다릅니다.
          </p>
        )}
        <div>
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {status.phase === "pending" && <ButtonSpinner />}
            일괄 소각 시도
          </button>
        </div>
      </form>
      <p className="hint-text">
        전송과 달리 소각은 <code>transferable</code> 여부와 무관하게 항상 성공하는 게 정상입니다.
      </p>
      <TxStatusBanner status={status} hash={hash} />
    </div>
  );
}
