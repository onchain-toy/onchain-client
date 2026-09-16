import { useState } from "react";
import { WalletBar } from "./components/WalletBar";
import { BadgeList } from "./components/BadgeList";
import { AdminPanel } from "./components/AdminPanel";
import { TransferTestPanel } from "./components/TransferTestPanel";
import { useAdminAccess } from "./hooks/useAdminAccess";
import "./App.css";

function App() {
  const { isAdmin, isMinter, isPauser } = useAdminAccess();
  const hasAdminAccess = isAdmin || isMinter || isPauser;
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <div className="page">
      <header className="app-header">
        <div>
          <span className="app-eyebrow">Polygon Amoy</span>
          <h1 className="app-title">Badge dApp</h1>
          <p className="app-subtitle">ERC-1155 · non-transferable by default</p>
        </div>
        <div className="header-actions">
          <WalletBar />
          {hasAdminAccess && (
            <button
              type="button"
              className={`btn admin-toggle ${adminOpen ? "admin-toggle-open" : ""}`}
              aria-expanded={adminOpen}
              onClick={() => setAdminOpen((v) => !v)}
            >
              관리자 <span className="admin-toggle-caret">▾</span>
            </button>
          )}
        </div>
      </header>
      <div className="hr-double" />

      {hasAdminAccess && (
        <div className={`admin-drawer ${adminOpen ? "admin-drawer-open" : ""}`}>
          <div className="admin-drawer-inner">
            <section className="card">
              <h2 className="card-title">관리자</h2>
              <AdminPanel />
            </section>
          </div>
        </div>
      )}

      <main className="app-main">
        <section className="card">
          <h2 className="card-title">배지 목록</h2>
          <BadgeList />
        </section>

        <section className="card">
          <h2 className="card-title">전송 · 승인 테스트</h2>
          <p className="card-hint">
            아무 지갑으로나 전송/승인이 실제로 막히는지 직접 시도해볼 수 있습니다.
          </p>
          <TransferTestPanel />
        </section>
      </main>
    </div>
  );
}

export default App;
