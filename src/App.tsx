import { useEffect, useState } from "react";
import "./styles.css";
import type { Ledger } from "./types";
import {
  isAbnormal,
  isBorrowed,
  loadLedger,
  pipeById,
  resetLedger,
  saveLedger,
  today,
  uid,
} from "./store";
import PositionsView from "./PositionsView";
import MeasureView from "./MeasureView";
import BorrowView from "./BorrowView";
import AbnormalView from "./AbnormalView";
import ReportView from "./ReportView";

type TabKey = "positions" | "measure" | "borrow" | "abnormal" | "report";

const TABS: { key: TabKey; label: string }[] = [
  { key: "positions", label: "音栓列表" },
  { key: "measure", label: "调音记录" },
  { key: "borrow", label: "管位借用" },
  { key: "abnormal", label: "异常音管" },
  { key: "report", label: "维护报告" },
];

function App() {
  const [tab, setTab] = useState<TabKey>("positions");
  const [ledger, setLedger] = useState<Ledger>(loadLedger);

  // 数据只存浏览器：每次变更都写回 localStorage
  useEffect(() => {
    saveLedger(ledger);
  }, [ledger]);

  // ---------- 台账操作 ----------

  const addPosition: Parameters<typeof PositionsView>[0]["onAddPosition"] = (input) => {
    setLedger((l) => {
      const pipe = {
        id: uid("pipe"),
        code: input.pipeCode,
        kind: "original" as const,
        status: "installed" as const,
      };
      const position = {
        id: uid("pos"),
        venue: input.venue,
        stop: input.stop,
        positionNo: input.positionNo,
        nominalPitch: input.nominalPitch,
        currentPipeId: pipe.id,
        conclusion: "待复核" as const,
      };
      return {
        ...l,
        pipes: [...l.pipes, pipe],
        positions: [...l.positions, position],
      };
    });
  };

  // 测量跟随当前安装的管：写入测量时管位上装着的那支管
  const addMeasurement: Parameters<typeof MeasureView>[0]["onAddMeasurement"] = (input) => {
    setLedger((l) => {
      const position = l.positions.find((p) => p.id === input.positionId);
      if (!position || !position.currentPipeId) return l;
      const measurement = {
        id: uid("m"),
        pipeId: position.currentPipeId,
        ...input,
      };
      const positions = l.positions.map((p) =>
        p.id === position.id
          ? { ...p, conclusion: isAbnormal(measurement) ? ("异常" as const) : ("正常" as const) }
          : p
      );
      return { ...l, positions, measurements: [...l.measurements, measurement] };
    });
  };

  // 停用原管：登记送修去向 + 替代管，原管转为送修中，结论待复核
  const sendRepair: Parameters<typeof BorrowView>[0]["onSendRepair"] = (input) => {
    setLedger((l) => {
      const position = l.positions.find((p) => p.id === input.positionId);
      const original = position ? pipeById(l, position.currentPipeId) : undefined;
      if (!position || !original || original.kind !== "original") return l;

      // 库里已有同编号库存备用管则复用，否则新建一支
      let spare = l.pipes.find(
        (p) => p.kind === "spare" && p.status === "stock" && p.code === input.spareCode
      );
      const pipes = l.pipes.map((p) =>
        p.id === original.id
          ? { ...p, status: "repair" as const, repairDestination: input.repairDestination }
          : p
      );
      if (spare) {
        spare = { ...spare, status: "installed" as const };
        pipes.splice(
          pipes.findIndex((p) => p.id === spare!.id),
          1,
          spare
        );
      } else {
        spare = { id: uid("pipe"), code: input.spareCode, kind: "spare", status: "installed" };
        pipes.push(spare);
      }

      const event = {
        id: uid("ev"),
        positionId: position.id,
        type: "send-repair" as const,
        date: today(),
        outPipeId: original.id,
        inPipeId: spare.id,
        repairDestination: input.repairDestination,
        note: input.note,
      };
      const positions = l.positions.map((p) =>
        p.id === position.id
          ? { ...p, currentPipeId: spare!.id, conclusion: "待复核" as const }
          : p
      );
      return { ...l, pipes, positions, events: [...l.events, event] };
    });
  };

  // 原管回装：只影响本管位，结论待复核；替代管（如有）退回库存
  const reinstallOriginal = (positionId: string) => {
    setLedger((l) => {
      const position = l.positions.find((p) => p.id === positionId);
      if (!position) return l;
      const sentIds = l.events
        .filter((e) => e.positionId === positionId && e.type === "send-repair" && e.outPipeId)
        .map((e) => e.outPipeId as string);
      const original = l.pipes.find((p) => sentIds.includes(p.id) && p.status === "repair");
      if (!original) return l;

      const spare = pipeById(l, position.currentPipeId);
      const pipes = l.pipes.map((p) => {
        if (p.id === original.id) {
          const { repairDestination: _dropped, ...rest } = p;
          return { ...rest, status: "installed" as const };
        }
        if (spare && p.id === spare.id) return { ...p, status: "stock" as const };
        return p;
      });
      const event = {
        id: uid("ev"),
        positionId,
        type: "reinstall-original" as const,
        date: today(),
        outPipeId: spare?.id ?? null,
        inPipeId: original.id,
        note: "原管修复回装，结论待复核",
      };
      const positions = l.positions.map((p) =>
        p.id === positionId
          ? { ...p, currentPipeId: original.id, conclusion: "待复核" as const }
          : p
      );
      return { ...l, pipes, positions, events: [...l.events, event] };
    });
  };

  // 撤走替代管：管位暂时空缺，仅本管位结论待复核
  const removeSpare = (positionId: string) => {
    setLedger((l) => {
      const position = l.positions.find((p) => p.id === positionId);
      const spare = position ? pipeById(l, position.currentPipeId) : undefined;
      if (!position || !spare || spare.kind !== "spare") return l;
      const pipes = l.pipes.map((p) =>
        p.id === spare.id ? { ...p, status: "stock" as const } : p
      );
      const event = {
        id: uid("ev"),
        positionId,
        type: "remove-spare" as const,
        date: today(),
        outPipeId: spare.id,
        inPipeId: null,
        note: "替代管撤走退回库存，结论待复核",
      };
      const positions = l.positions.map((p) =>
        p.id === positionId
          ? { ...p, currentPipeId: null, conclusion: "待复核" as const }
          : p
      );
      return { ...l, pipes, positions, events: [...l.events, event] };
    });
  };

  // ---------- 汇总指标 ----------

  const stopCount = new Set(ledger.positions.map((p) => p.venue + p.stop)).size;
  const borrowCount = ledger.positions.filter((p) => isBorrowed(p, ledger)).length;
  const abnormalCount = ledger.positions.filter((p) => p.conclusion === "异常").length;
  const pendingCount = ledger.positions.filter((p) => p.conclusion === "待复核").length;
  const metrics: [string, number][] = [
    ["音栓数量", stopCount],
    ["借用中管位", borrowCount],
    ["偏差超限", abnormalCount],
    ["待复核", pendingCount],
  ];

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62005 · 管风琴维护 · 数据仅保存于本浏览器</p>
        <h1>管风琴音管调音记录</h1>
        <span>
          开裂音管送修后，同音高备用管临时上位：送修时登记去向与替代管，此后测量与异常判断都跟随当前安装的管；
          替代管撤走或原管回装时，仅该管位的调音结论转为待复核，其他管位照常保留。
        </span>
      </section>

      <section className="metrics">
        {metrics.map(([label, value]) => (
          <article key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "tab active" : "tab"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
        <button className="tab ghost" onClick={() => setLedger(resetLedger())}>
          重置示例数据
        </button>
      </nav>

      {tab === "positions" && <PositionsView ledger={ledger} onAddPosition={addPosition} />}
      {tab === "measure" && <MeasureView ledger={ledger} onAddMeasurement={addMeasurement} />}
      {tab === "borrow" && (
        <BorrowView
          ledger={ledger}
          onSendRepair={sendRepair}
          onReinstallOriginal={reinstallOriginal}
          onRemoveSpare={removeSpare}
        />
      )}
      {tab === "abnormal" && <AbnormalView ledger={ledger} />}
      {tab === "report" && <ReportView ledger={ledger} />}
    </main>
  );
}

export default App;
