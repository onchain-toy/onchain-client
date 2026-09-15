import { WalletBar } from "./components/WalletBar";
import { BadgeList } from "./components/BadgeList";
import { AdminPanel } from "./components/AdminPanel";
import { TransferTestPanel } from "./components/TransferTestPanel";
import "./App.css";

function App() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      <h1>Badge dApp</h1>
      <p style={{ color: "#666" }}>Polygon Amoy — ERC-1155 배지 (전송 차단)</p>

      <section style={{ marginTop: 24 }}>
        <WalletBar />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>배지 목록</h2>
        <BadgeList />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>관리자</h2>
        <AdminPanel />
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>전송/승인 차단 테스트</h2>
        <TransferTestPanel />
      </section>
    </div>
  );
}

export default App;
