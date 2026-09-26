import { useMemo, useState } from "react";
import type { Ledger } from "./types";
import {
  fmtDeviation,
  isAbnormal,
  pipeById,
  positionById,
  preRepairMeasurement,
} from "./store";

export default function ReportView({ ledger }: { ledger: Ledger }) {
  const dates = useMemo(
    () =>
      Array.from(new Set(ledger.measurements.map((m) => m.date))).sort((a, b) =>
        a < b ? 1 : -1
      ),
    [ledger.measurements]
  );
  const [date, setDate] = useState(dates[0] ?? "");

  const rows = ledger.measurements
    .filter((m) => m.date === date)
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const venues = Array.from(
    new Set(rows.map((m) => positionById(ledger, m.positionId)?.venue).filter(Boolean))
  );
  const pending = ledger.positions.filter((p) => p.conclusion === "待复核");

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>单次维护报告</p>
          <h2>按测量日期生成</h2>
        </div>
        <div className="actions">
          <select value={date} onChange={(e) => setDate(e.target.value)}>
            {dates.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
          <button onClick={() => window.print()}>打印报告</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="hint">该日期没有测量记录。</p>
      ) : (
        <>
          <p className="hint">
            维护日期 {date} ｜ 场馆：{venues.join("、")} ｜ 共 {rows.length} 次测量。
            每行列出管位、测量时安装的当前管，以及该管位原管送修前的旧值，便于回装后对照。
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>管位（场馆 / 音栓 / 编号）</th>
                  <th>当前管</th>
                  <th>音高 / 偏差</th>
                  <th>温湿度</th>
                  <th>簧片 / 备注</th>
                  <th>送修前旧值（原管）</th>
                  <th>判定</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const pos = positionById(ledger, m.positionId);
                  const pipe = pipeById(ledger, m.pipeId);
                  const old = pos ? preRepairMeasurement(ledger, pos.id) : undefined;
                  const abnormal = isAbnormal(m);
                  return (
                    <tr key={m.id} className={abnormal ? "row-bad" : ""}>
                      <td>{pos ? `${pos.venue} · ${pos.stop} · ${pos.positionNo}` : "—"}</td>
                      <td>
                        {pipe
                          ? `${pipe.code}（${pipe.kind === "spare" ? "备用管" : "原管"}）`
                          : "—"}
                      </td>
                      <td>
                        {m.pitch} · {fmtDeviation(m.deviationCents)}
                      </td>
                      <td>
                        {m.temperature} ℃ / {m.humidity} %
                      </td>
                      <td>
                        {m.reedStatus}
                        {m.note ? ` · ${m.note}` : ""}
                      </td>
                      <td>
                        {old
                          ? `${old.measurement.date} ${fmtDeviation(old.measurement.deviationCents)}（送修 ${old.event.repairDestination ?? "—"}）`
                          : "无送修记录"}
                      </td>
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
        </>
      )}

      <h3>换管待复核（全台账）</h3>
      {pending.length === 0 ? (
        <p className="hint">所有管位结论有效，无待复核项。</p>
      ) : (
        <ul className="pending-list">
          {pending.map((p) => {
            const pipe = pipeById(ledger, p.currentPipeId);
            return (
              <li key={p.id}>
                {p.venue} · {p.stop} · {p.positionNo} —— 当前管：
                {pipe ? pipe.code : "（空缺）"}，结论待复核
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
