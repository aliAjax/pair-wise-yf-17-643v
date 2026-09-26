import { useMemo, useState } from "react";
import type { Ledger } from "./types";
import {
  DEVIATION_LIMIT,
  fmtDeviation,
  isAbnormal,
  pipeById,
  positionById,
  today,
} from "./store";

interface Props {
  ledger: Ledger;
  onAddMeasurement: (input: {
    positionId: string;
    date: string;
    pitch: string;
    deviationCents: number;
    temperature: number;
    humidity: number;
    reedStatus: string;
    note: string;
  }) => void;
}

const REED_OPTIONS = ["正常", "需微调", "簧片磨损", "异响"];

export default function MeasureView({ ledger, onAddMeasurement }: Props) {
  const measurable = ledger.positions.filter((p) => p.currentPipeId);
  const [form, setForm] = useState({
    positionId: measurable[0]?.id ?? "",
    date: today(),
    pitch: "",
    deviationCents: "0",
    temperature: "22",
    humidity: "50",
    reedStatus: "正常",
    note: "",
  });

  const position = positionById(ledger, form.positionId);
  const currentPipe = position ? pipeById(ledger, position.currentPipeId) : undefined;

  const rows = useMemo(
    () =>
      [...ledger.measurements].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [ledger.measurements]
  );

  const submit = () => {
    if (!position || !currentPipe) return;
    onAddMeasurement({
      positionId: position.id,
      date: form.date,
      pitch: form.pitch || position.nominalPitch,
      deviationCents: Number(form.deviationCents) || 0,
      temperature: Number(form.temperature) || 0,
      humidity: Number(form.humidity) || 0,
      reedStatus: form.reedStatus,
      note: form.note,
    });
    setForm({ ...form, note: "", deviationCents: "0" });
  };

  return (
    <>
      <section className="panel">
        <div className="heading">
          <div>
            <p>调音记录</p>
            <h2>新增测量（记入当前安装管名下）</h2>
          </div>
          <button className="primary" onClick={submit} disabled={!currentPipe}>
            保存测量
          </button>
        </div>
        <div className="field-grid">
          <label>
            <span>管位（场馆 / 音栓 / 编号）</span>
            <select
              value={form.positionId}
              onChange={(e) => setForm({ ...form, positionId: e.target.value })}
            >
              {measurable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.venue} · {p.stop} · {p.positionNo}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>当前安装管（测量归属）</span>
            <input
              readOnly
              value={
                currentPipe
                  ? `${currentPipe.code}（${currentPipe.kind === "spare" ? "备用管" : "原管"}）`
                  : "管位空缺，无法测量"
              }
            />
          </label>
          <label>
            <span>测量日期</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label>
            <span>实测音高</span>
            <input
              placeholder={position ? `默认 ${position.nominalPitch}` : "如 C#4"}
              value={form.pitch}
              onChange={(e) => setForm({ ...form, pitch: e.target.value })}
            />
          </label>
          <label>
            <span>音分偏差（cent，超过 ±{DEVIATION_LIMIT} 判异常）</span>
            <input
              type="number"
              value={form.deviationCents}
              onChange={(e) => setForm({ ...form, deviationCents: e.target.value })}
            />
          </label>
          <label>
            <span>温度（℃）</span>
            <input
              type="number"
              step="0.1"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: e.target.value })}
            />
          </label>
          <label>
            <span>湿度（%）</span>
            <input
              type="number"
              step="1"
              value={form.humidity}
              onChange={(e) => setForm({ ...form, humidity: e.target.value })}
            />
          </label>
          <label>
            <span>簧片状态</span>
            <select
              value={form.reedStatus}
              onChange={(e) => setForm({ ...form, reedStatus: e.target.value })}
            >
              {REED_OPTIONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            <span>维修备注</span>
            <input
              placeholder="如 簧片需微调"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>调音偏差表 · 温湿度记录</p>
            <h2>全部测量（{rows.length} 条）</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>管位</th>
                <th>测量时安装的管</th>
                <th>音高</th>
                <th>音分偏差</th>
                <th>温度</th>
                <th>湿度</th>
                <th>簧片状态</th>
                <th>维修备注</th>
                <th>判定</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const pos = positionById(ledger, m.positionId);
                const pipe = pipeById(ledger, m.pipeId);
                const abnormal = isAbnormal(m);
                return (
                  <tr key={m.id} className={abnormal ? "row-bad" : ""}>
                    <td>{m.date}</td>
                    <td>
                      {pos ? `${pos.venue} · ${pos.stop} · ${pos.positionNo}` : "—"}
                    </td>
                    <td>
                      {pipe
                        ? `${pipe.code}（${pipe.kind === "spare" ? "备用管" : "原管"}）`
                        : "—"}
                      {pos && pos.currentPipeId === m.pipeId && (
                        <span className="tag">当前管</span>
                      )}
                    </td>
                    <td>{m.pitch}</td>
                    <td className={abnormal ? "num-bad" : ""}>{fmtDeviation(m.deviationCents)}</td>
                    <td>{m.temperature} ℃</td>
                    <td>{m.humidity} %</td>
                    <td>{m.reedStatus}</td>
                    <td>{m.note || "—"}</td>
                    <td>
                      <span className={abnormal ? "badge bad" : "badge ok"}>
                        {abnormal ? "异常" : "正常"}
                      </span>
                    </td>
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
