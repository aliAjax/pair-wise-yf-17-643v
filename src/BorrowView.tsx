import { useState } from "react";
import type { Ledger } from "./types";
import {
  fmtDeviation,
  isBorrowed,
  originalInRepair,
  pipeById,
  positionById,
  preRepairMeasurement,
} from "./store";

interface Props {
  ledger: Ledger;
  onSendRepair: (input: {
    positionId: string;
    repairDestination: string;
    spareCode: string;
    note: string;
  }) => void;
  onReinstallOriginal: (positionId: string) => void;
  onRemoveSpare: (positionId: string) => void;
}

const EVENT_LABEL: Record<string, string> = {
  "send-repair": "停用原管 · 送修",
  "reinstall-original": "原管回装",
  "remove-spare": "撤走替代管",
};

export default function BorrowView({
  ledger,
  onSendRepair,
  onReinstallOriginal,
  onRemoveSpare,
}: Props) {
  // 只有装着原管的管位才能办理送修
  const repairable = ledger.positions.filter((p) => {
    const pipe = pipeById(ledger, p.currentPipeId);
    return pipe?.kind === "original";
  });
  const borrowed = ledger.positions.filter((p) => isBorrowed(p, ledger));
  const empty = ledger.positions.filter((p) => !p.currentPipeId);
  const stockSpares = ledger.pipes.filter((p) => p.kind === "spare" && p.status === "stock");

  const [form, setForm] = useState({
    positionId: repairable[0]?.id ?? "",
    repairDestination: "",
    spareCode: "",
    note: "",
  });

  const submit = () => {
    if (!form.positionId || !form.repairDestination || !form.spareCode) return;
    onSendRepair(form);
    setForm({ ...form, repairDestination: "", spareCode: "", note: "" });
  };

  const events = [...ledger.events].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <div className="workspace">
        <section className="panel">
          <div className="heading">
            <div>
              <p>第一步 · 停用原管</p>
              <h2>送修登记</h2>
            </div>
            <button
              className="primary"
              onClick={submit}
              disabled={!form.positionId || !form.repairDestination || !form.spareCode}
            >
              登记送修
            </button>
          </div>
          <div className="field-grid one">
            <label>
              <span>送修管位（当前须为原管）</span>
              <select
                value={form.positionId}
                onChange={(e) => setForm({ ...form, positionId: e.target.value })}
              >
                {repairable.length === 0 && <option value="">无可送修管位</option>}
                {repairable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.venue} · {p.stop} · {p.positionNo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>送修去向（维修工坊 / 厂家）</span>
              <input
                placeholder="如 沪上管风琴工坊"
                value={form.repairDestination}
                onChange={(e) => setForm({ ...form, repairDestination: e.target.value })}
              />
            </label>
            <label>
              <span>替代管编号（同音高备用管）</span>
              <input
                list="stock-spares"
                placeholder="如 备用 S-11，可填新编号"
                value={form.spareCode}
                onChange={(e) => setForm({ ...form, spareCode: e.target.value })}
              />
              <datalist id="stock-spares">
                {stockSpares.map((s) => (
                  <option key={s.id} value={s.code} />
                ))}
              </datalist>
            </label>
            <label>
              <span>备注</span>
              <input
                placeholder="如 管体开裂"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
          </div>
          <p className="hint">
            登记后：原管标记为“送修中”，替代管装上管位；此后该管位的测量与异常判断都记在替代管名下，管位结论转为“待复核”。
          </p>
        </section>

        <section className="panel">
          <div className="heading">
            <div>
              <p>第二步 · 回装 / 撤走</p>
              <h2>借用中（{borrowed.length}）与空缺管位（{empty.length}）</h2>
            </div>
          </div>
          {borrowed.length === 0 && empty.length === 0 && (
            <p className="hint">当前没有借用中或空缺的管位。</p>
          )}
          <div className="records">
            {borrowed.map((pos) => {
              const spare = pipeById(ledger, pos.currentPipeId);
              const original = originalInRepair(ledger, pos);
              const old = preRepairMeasurement(ledger, pos.id);
              return (
                <article key={pos.id}>
                  <b>借</b>
                  <div>
                    <h3>
                      {pos.venue} · {pos.stop} · {pos.positionNo}
                    </h3>
                    <p>
                      替代管：{spare?.code ?? "—"} ｜ 原管：{original?.code ?? "—"} 送
                      {original?.repairDestination ?? "—"} ｜ 送修前旧值：
                      {old ? `${old.measurement.date} ${fmtDeviation(old.measurement.deviationCents)}` : "无"}
                    </p>
                    <div className="actions">
                      <button className="primary" onClick={() => onReinstallOriginal(pos.id)}>
                        原管回装
                      </button>
                      <button onClick={() => onRemoveSpare(pos.id)}>撤走替代管</button>
                    </div>
                  </div>
                </article>
              );
            })}
            {empty.map((pos) => {
              const original = originalInRepair(ledger, pos);
              return (
                <article key={pos.id}>
                  <b>空</b>
                  <div>
                    <h3>
                      {pos.venue} · {pos.stop} · {pos.positionNo}
                    </h3>
                    <p>
                      管位空缺，结论待复核。
                      {original
                        ? `原管 ${original.code} 仍在 ${original.repairDestination ?? "维修方"} 修理。`
                        : "无在修原管。"}
                    </p>
                    {original && (
                      <div className="actions">
                        <button className="primary" onClick={() => onReinstallOriginal(pos.id)}>
                          原管回装
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <p className="hint">
            回装或撤走只把该管位的调音结论置为“待复核”，其他管位的结论与历史记录不受影响。
          </p>
        </section>
      </div>

      <section className="panel">
        <div className="heading">
          <div>
            <p>流转日志</p>
            <h2>借用事件（{events.length} 条）</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>管位</th>
                <th>事件</th>
                <th>卸下 → 装上</th>
                <th>送修去向</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const pos = positionById(ledger, e.positionId);
                const out = pipeById(ledger, e.outPipeId);
                const inn = pipeById(ledger, e.inPipeId);
                return (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>{pos ? `${pos.venue} · ${pos.stop} · ${pos.positionNo}` : "—"}</td>
                    <td>{EVENT_LABEL[e.type]}</td>
                    <td>
                      {out?.code ?? "—"} → {inn?.code ?? "（空缺）"}
                    </td>
                    <td>{e.repairDestination ?? "—"}</td>
                    <td>{e.note || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
