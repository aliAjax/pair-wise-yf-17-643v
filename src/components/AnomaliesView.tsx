import {
  abnormalReasons,
  conclusionOf,
  currentPipeMeasurements,
  fmtCents,
  fmtDateTime,
  isAbnormal,
  pipeById,
  positionPath,
} from "../domain";
import type { OrganStore } from "../store";
import { PipeKindBadge } from "./badges";

export default function AnomaliesView({ store }: { store: OrganStore }) {
  const { state } = store;
  const abnormalPositions = state.positions.filter(
    (p) => conclusionOf(p, state.measurements) === "异常",
  );
  const pendingPositions = state.positions.filter(
    (p) => conclusionOf(p, state.measurements) === "待复核",
  );
  const abnormalRows = state.measurements
    .filter(isAbnormal)
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));

  return (
    <section className="stack">
      <div className="panel">
        <div className="heading">
          <div>
            <p>异常音管标记</p>
            <h2>当前异常管位（跟随当前安装管）</h2>
          </div>
        </div>
        {abnormalPositions.length === 0 && <p className="muted">当前没有异常管位。</p>}
        <div className="cards">
          {abnormalPositions.map((position) => {
            const valid = currentPipeMeasurements(position, state.measurements);
            const latest = valid[valid.length - 1];
            const pipe = pipeById(state, position.currentPipeId);
            return (
              <article className="loan-card bad" key={position.id}>
                <div className="loan-head">
                  <strong>{positionPath(state, position)}</strong>
                  <span className="badge bad">异常</span>
                </div>
                <p>
                  当前管：<code>{pipe?.code}</code>（{pipe?.kind}） · 最近测量{" "}
                  {fmtDateTime(latest.measuredAt)} · 偏差 {fmtCents(latest.cents)}¢ ·{" "}
                  {latest.temperature}℃/{latest.humidity}%
                </p>
                <ul className="reasons">
                  {abnormalReasons(latest).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {latest.note && <p className="muted">备注：{latest.note}</p>}
              </article>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="heading">
          <div>
            <p>待复核</p>
            <h2>换管 / 回装后待复核管位</h2>
          </div>
        </div>
        {pendingPositions.length === 0 && <p className="muted">没有待复核管位。</p>}
        <ul className="plain-list">
          {pendingPositions.map((position) => {
            const pipe = pipeById(state, position.currentPipeId);
            return (
              <li key={position.id}>
                <span className="badge pending">待复核</span>{" "}
                {positionPath(state, position)} —{" "}
                {position.currentPipeId ? (
                  <>
                    当前管 <code>{pipe?.code}</code> 于 {fmtDateTime(position.installedAt)}{" "}
                    安装，本安装周期内尚未复测
                  </>
                ) : (
                  "替代管已撤走，管位空缺，待装管后复测"
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="panel">
        <div className="heading">
          <div>
            <p>历史异常</p>
            <h2>全部异常测量（含已卸下 / 送修中的管）</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>时间</th>
                <th>管位</th>
                <th>当时音管</th>
                <th>偏差</th>
                <th>异常原因</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {abnormalRows.map((m) => {
                const position = state.positions.find((p) => p.id === m.positionId);
                const pipe = pipeById(state, m.pipeId);
                const isCurrent = position?.currentPipeId === m.pipeId;
                return (
                  <tr key={m.id} className="row-abnormal">
                    <td>{fmtDateTime(m.measuredAt)}</td>
                    <td>{position ? positionPath(state, position) : "—"}</td>
                    <td>
                      <code>{pipe?.code}</code> {pipe && <PipeKindBadge kind={pipe.kind} />}
                      {isCurrent ? (
                        <span className="badge pipe">当前在装</span>
                      ) : (
                        <span className="badge muted">{pipe?.status ?? "已卸下"}</span>
                      )}
                    </td>
                    <td className="cents-bad">{fmtCents(m.cents)}¢</td>
                    <td>{abnormalReasons(m).join("；")}</td>
                    <td>{m.note || "—"}</td>
                  </tr>
                );
              })}
              {abnormalRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    暂无异常测量
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
