import { useState } from "react";
import {
  activeLoanOf,
  buildReport,
  fmtCents,
  fmtDateTime,
  positionPath,
} from "../domain";
import type { OrganStore } from "../store";
import { ConclusionBadge, PipeKindBadge } from "./badges";

export default function ReportView({ store }: { store: OrganStore }) {
  const { state } = store;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const defaultId =
    state.positions.find((p) => activeLoanOf(state, p.id))?.id ??
    state.positions[0]?.id ??
    "";
  const positionId = selectedId ?? defaultId;
  if (!positionId) return <p className="muted">暂无管位数据。</p>;
  const report = buildReport(state, positionId);
  const position = report.position;

  return (
    <section className="stack">
      <div className="panel no-print">
        <div className="heading">
          <div>
            <p>单次维护报告</p>
            <h2>选择管位</h2>
          </div>
          <button onClick={() => window.print()}>打印报告</button>
        </div>
        <label className="report-picker">
          <span>管位</span>
          <select value={positionId} onChange={(e) => setSelectedId(e.target.value)}>
            {state.positions.map((p) => (
              <option key={p.id} value={p.id}>
                {positionPath(state, p)}（{p.pitch}）
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="panel report">
        <div className="report-head">
          <div>
            <p className="kicker">单次维护报告</p>
            <h2>
              {report.venueName} · {report.stopName} · {position.label}
            </h2>
            <p className="muted">
              生成时间：{fmtDateTime(new Date().toISOString())} · 数据仅保存于本浏览器
            </p>
          </div>
          <ConclusionBadge conclusion={report.conclusion} />
        </div>

        <dl className="report-grid">
          <div>
            <dt>管位</dt>
            <dd>
              {report.stopName} {position.label}（{report.stopKind}）
            </dd>
          </div>
          <div>
            <dt>标称音高</dt>
            <dd>{position.pitch}</dd>
          </div>
          <div>
            <dt>当前安装管</dt>
            <dd>
              {report.currentPipe ? (
                <>
                  <code>{report.currentPipe.code}</code>{" "}
                  <PipeKindBadge kind={report.currentPipe.kind} /> ·{" "}
                  {fmtDateTime(position.installedAt)} 安装
                </>
              ) : (
                "空缺（替代管已撤走）"
              )}
            </dd>
          </div>
          <div>
            <dt>当前管有效测量</dt>
            <dd>{report.validMeasurements.length} 次</dd>
          </div>
          <div>
            <dt>调音结论</dt>
            <dd>
              <ConclusionBadge conclusion={report.conclusion} />
            </dd>
          </div>
        </dl>

        <section className="report-section">
          <h3>送修前旧值（原管停用前最后一次测量）</h3>
          {report.loan ? (
            report.preRepair ? (
              <dl className="report-grid">
                <div>
                  <dt>原管编号</dt>
                  <dd>
                    <code>{report.originalPipe?.code}</code>
                  </dd>
                </div>
                <div>
                  <dt>测量时间</dt>
                  <dd>{fmtDateTime(report.preRepair.measuredAt)}</dd>
                </div>
                <div>
                  <dt>音分偏差</dt>
                  <dd>{fmtCents(report.preRepair.cents)}¢</dd>
                </div>
                <div>
                  <dt>温度 / 湿度</dt>
                  <dd>
                    {report.preRepair.temperature}℃ / {report.preRepair.humidity}%
                  </dd>
                </div>
                <div>
                  <dt>簧片状态</dt>
                  <dd>{report.preRepair.reed}</dd>
                </div>
                <div>
                  <dt>备注</dt>
                  <dd>{report.preRepair.note || "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="muted">原管送修前没有留下测量记录。</p>
            )
          ) : (
            <p className="muted">本管位没有送修 / 借用记录。</p>
          )}
          {report.loan && (
            <p className="muted">
              送修去向：{report.loan.destination} · 送修时间：
              {fmtDateTime(report.loan.sentAt)} · 替代管：
              <code>{report.sparePipe?.code}</code>
              {report.loan.status === "已结束" &&
                ` · 已于 ${fmtDateTime(report.loan.closedAt)} ${report.loan.closeAction}`}
            </p>
          )}
        </section>

        <section className="report-section">
          <h3>当前管最近测量</h3>
          {report.latest ? (
            <dl className="report-grid">
              <div>
                <dt>测量时间</dt>
                <dd>{fmtDateTime(report.latest.measuredAt)}</dd>
              </div>
              <div>
                <dt>音分偏差</dt>
                <dd>{fmtCents(report.latest.cents)}¢</dd>
              </div>
              <div>
                <dt>温度 / 湿度</dt>
                <dd>
                  {report.latest.temperature}℃ / {report.latest.humidity}%
                </dd>
              </div>
              <div>
                <dt>簧片状态</dt>
                <dd>{report.latest.reed}</dd>
              </div>
              <div>
                <dt>备注</dt>
                <dd>{report.latest.note || "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">当前安装管在本安装周期内尚无测量，结论待复核。</p>
          )}
        </section>

        {report.timeline.length > 0 && (
          <section className="report-section">
            <h3>借用 / 送修时间线</h3>
            <ul className="timeline">
              {report.timeline.map((t, i) => (
                <li key={i}>
                  <span className="muted">{fmtDateTime(t.at)}</span> — {t.text}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="report-section">
          <h3>本管位测量台账（按音管归属）</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>音管</th>
                  <th>音分偏差</th>
                  <th>温度/湿度</th>
                  <th>簧片</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {report.history.map((m) => {
                  const isCurrent = m.pipeId === position.currentPipeId;
                  const pipe = state.pipes.find((p) => p.id === m.pipeId);
                  return (
                    <tr key={m.id}>
                      <td>{fmtDateTime(m.measuredAt)}</td>
                      <td>
                        <code>{pipe?.code}</code>{" "}
                        {isCurrent ? (
                          <span className="badge pipe">当前在装</span>
                        ) : (
                          <span className="badge muted">{pipe?.status ?? "已卸下"}</span>
                        )}
                      </td>
                      <td>{fmtCents(m.cents)}¢</td>
                      <td>
                        {m.temperature}℃ / {m.humidity}%
                      </td>
                      <td>{m.reed}</td>
                      <td>{m.note || "—"}</td>
                    </tr>
                  );
                })}
                {report.history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      本管位暂无测量记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
