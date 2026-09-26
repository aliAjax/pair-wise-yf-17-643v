import { useState } from "react";
import type { Ledger, PipePosition } from "./types";
import {
  fmtDeviation,
  isBorrowed,
  latestMeasurementOnPipe,
  pipeById,
} from "./store";

interface Props {
  ledger: Ledger;
  onAddPosition: (input: {
    venue: string;
    stop: string;
    positionNo: string;
    nominalPitch: string;
    pipeCode: string;
  }) => void;
}

function ConclusionBadge({ value }: { value: PipePosition["conclusion"] }) {
  const cls =
    value === "正常" ? "badge ok" : value === "异常" ? "badge bad" : "badge pending";
  return <span className={cls}>{value}</span>;
}

export function PositionBadge({ position, ledger }: { position: PipePosition; ledger: Ledger }) {
  const pipe = pipeById(ledger, position.currentPipeId);
  if (!pipe) return <span className="badge muted">管位空缺</span>;
  return (
    <span className={pipe.kind === "spare" ? "badge spare" : "badge neutral"}>
      {pipe.code}（{pipe.kind === "spare" ? "备用管" : "原管"}）
    </span>
  );
}

export default function PositionsView({ ledger, onAddPosition }: Props) {
  const [form, setForm] = useState({
    venue: "",
    stop: "",
    positionNo: "",
    nominalPitch: "",
    pipeCode: "",
  });

  const stops = Array.from(new Set(ledger.positions.map((p) => p.venue + " · " + p.stop)));

  const submit = () => {
    if (!form.venue || !form.stop || !form.positionNo || !form.pipeCode) return;
    onAddPosition({ ...form, nominalPitch: form.nominalPitch || form.positionNo });
    setForm({ venue: "", stop: "", positionNo: "", nominalPitch: "", pipeCode: "" });
  };

  return (
    <>
      <section className="panel">
        <div className="heading">
          <div>
            <p>音栓列表</p>
            <h2>管位台账（{stops.length} 组音栓）</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>场馆 / 音栓</th>
                <th>管位</th>
                <th>标称音高</th>
                <th>当前安装管</th>
                <th>当前管最近一次测量</th>
                <th>调音结论</th>
              </tr>
            </thead>
            <tbody>
              {ledger.positions.map((pos) => {
                const latest = latestMeasurementOnPipe(ledger, pos.id, pos.currentPipeId);
                return (
                  <tr key={pos.id}>
                    <td>
                      {pos.venue} · {pos.stop}
                    </td>
                    <td>{pos.positionNo}</td>
                    <td>{pos.nominalPitch}</td>
                    <td>
                      <PositionBadge position={pos} ledger={ledger} />
                      {isBorrowed(pos, ledger) && <span className="tag">借用中</span>}
                    </td>
                    <td>
                      {latest
                        ? `${latest.date} ${fmtDeviation(latest.deviationCents)}`
                        : "当前管暂无测量"}
                    </td>
                    <td>
                      <ConclusionBadge value={pos.conclusion} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>新增管位</p>
            <h2>登记新管位与原管</h2>
          </div>
          <button className="primary" onClick={submit}>
            保存管位
          </button>
        </div>
        <div className="field-grid">
          <label>
            <span>场馆名称</span>
            <input
              placeholder="如 St.Mary 教堂"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            />
          </label>
          <label>
            <span>音栓</span>
            <input
              placeholder="如 Trumpet 8'"
              value={form.stop}
              onChange={(e) => setForm({ ...form, stop: e.target.value })}
            />
          </label>
          <label>
            <span>音管编号（管位）</span>
            <input
              placeholder="如 C#4"
              value={form.positionNo}
              onChange={(e) => setForm({ ...form, positionNo: e.target.value })}
            />
          </label>
          <label>
            <span>标称音高</span>
            <input
              placeholder="默认同管位编号"
              value={form.nominalPitch}
              onChange={(e) => setForm({ ...form, nominalPitch: e.target.value })}
            />
          </label>
          <label>
            <span>原管实物编号</span>
            <input
              placeholder="如 P-TR-042"
              value={form.pipeCode}
              onChange={(e) => setForm({ ...form, pipeCode: e.target.value })}
            />
          </label>
        </div>
      </section>
    </>
  );
}

export { ConclusionBadge };
