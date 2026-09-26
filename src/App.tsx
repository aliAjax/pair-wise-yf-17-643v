import { useState } from "react";
import AnomaliesView from "./components/AnomaliesView";
import LoansView from "./components/LoansView";
import MeasureView from "./components/MeasureView";
import ReportView from "./components/ReportView";
import StopsView from "./components/StopsView";
import { conclusionOf } from "./domain";
import { useOrganStore } from "./store";
import "./styles.css";

const TABS = [
  { key: "stops", label: "音栓与管位" },
  { key: "measure", label: "调音测量" },
  { key: "loans", label: "借用台账" },
  { key: "anomalies", label: "异常标记" },
  { key: "report", label: "维护报告" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function App() {
  const store = useOrganStore();
  const { state } = store;
  const [tab, setTab] = useState<TabKey>("stops");

  const conclusions = state.positions.map((p) => conclusionOf(p, state.measurements));
  const abnormalCount = conclusions.filter((c) => c === "异常").length;
  const pendingCount = conclusions.filter((c) => c === "待复核").length;
  const activeLoans = state.loans.filter((l) => l.status === "借用中").length;

  return (
    <main className="app">
      <section className="hero">
        <div className="hero-top">
          <p>hxyfront-62005 · 管风琴维护 · 数据仅保存于本浏览器</p>
          <button
            className="no-print"
            onClick={() => {
              if (window.confirm("确定重置为演示数据？当前浏览器内的修改将丢失。")) {
                store.resetDemo();
              }
            }}
          >
            重置演示数据
          </button>
        </div>
        <h1>管风琴音管调音记录</h1>
        <span>
          开裂音管送修后，同音高备用管临时上位：停用原管时登记送修去向与替代管，
          测量与异常判断跟随当前安装的管；替代管撤走或原管回装仅使本管位调音结论转为
          「待复核」，其他管位结论照常保留。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>音栓数量</small>
          <strong>{state.stops.length}</strong>
        </article>
        <article>
          <small>异常管位</small>
          <strong>{abnormalCount}</strong>
        </article>
        <article>
          <small>借用中</small>
          <strong>{activeLoans}</strong>
        </article>
        <article>
          <small>待复核</small>
          <strong>{pendingCount}</strong>
        </article>
      </section>

      <nav className="tabs no-print">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "stops" && <StopsView store={store} />}
      {tab === "measure" && <MeasureView store={store} />}
      {tab === "loans" && <LoansView store={store} />}
      {tab === "anomalies" && <AnomaliesView store={store} />}
      {tab === "report" && <ReportView store={store} />}

      <footer className="foot muted">
        管位借用流程：送修登记 → 替代管上位（测量跟随当前管）→ 原管回装 / 撤走替代管
        （本管位待复核）→ 复测恢复结论。
      </footer>
    </main>
  );
}
