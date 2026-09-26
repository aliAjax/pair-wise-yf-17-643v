import { fmtCents, fmtDateTime, pipeById, positionById, positionPath } from "../domain";
import type { OrganStore } from "../store";
import type { Loan } from "../types";

function PreRepairValue({ store, loan }: { store: OrganStore; loan: Loan }) {
  const m = loan.preRepairMeasurementId
    ? store.state.measurements.find((x) => x.id === loan.preRepairMeasurementId)
    : undefined;
  if (!m) return <span className="muted">送修前无测量记录</span>;
  return (
    <span>
      {fmtCents(m.cents)}¢ · {m.temperature}℃ · {m.humidity}% · 簧片「{m.reed}」
      <span className="cell-sub">
        {fmtDateTime(m.measuredAt)} 测于原管 {pipeById(store.state, loan.originalPipeId)?.code}
      </span>
    </span>
  );
}

export default function LoansView({ store }: { store: OrganStore }) {
  const { state } = store;
  const active = state.loans.filter((l) => l.status === "借用中");
  const closed = state.loans
    .filter((l) => l.status === "已结束")
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));

  const closeLoan = (loan: Loan, action: "原管回装" | "替代管撤走") => {
    const hint =
      action === "原管回装"
        ? "确认原管已修复并回装？替代管将撤回备用库存，本管位调音结论转为「待复核」。"
        : "确认撤走替代管？管位将暂时空缺，本管位调音结论转为「待复核」。";
    if (!window.confirm(hint)) return;
    const err =
      action === "原管回装"
        ? store.reinstallOriginal(loan.id)
        : store.removeSpare(loan.id);
    if (err) window.alert(err);
  };

  return (
    <section className="stack">
      <div className="panel">
        <div className="heading">
          <div>
            <p>借用台账</p>
            <h2>进行中的送修 / 借用</h2>
          </div>
        </div>
        {active.length === 0 && (
          <p className="muted">
            当前没有进行中的借用。可在「音栓与管位」页对在装原管做送修登记。
          </p>
        )}
        <div className="cards">
          {active.map((loan) => {
            const position = positionById(state, loan.positionId);
            const original = pipeById(state, loan.originalPipeId);
            const spare = pipeById(state, loan.sparePipeId);
            return (
              <article className="loan-card" key={loan.id}>
                <div className="loan-head">
                  <strong>{position ? positionPath(state, position) : "—"}</strong>
                  <span className="badge pending">借用中</span>
                </div>
                <dl className="kv">
                  <div>
                    <dt>原管（送修中）</dt>
                    <dd>
                      <code>{original?.code}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>替代管（在装）</dt>
                    <dd>
                      <code>{spare?.code}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>送修去向</dt>
                    <dd>{loan.destination}</dd>
                  </div>
                  <div>
                    <dt>送修时间</dt>
                    <dd>{fmtDateTime(loan.sentAt)}</dd>
                  </div>
                  <div>
                    <dt>送修原因</dt>
                    <dd>{loan.reason}</dd>
                  </div>
                  <div>
                    <dt>送修前旧值</dt>
                    <dd>
                      <PreRepairValue store={store} loan={loan} />
                    </dd>
                  </div>
                </dl>
                <div className="modal-actions left">
                  <button
                    className="primary"
                    onClick={() => closeLoan(loan, "原管回装")}
                  >
                    原管回装
                  </button>
                  <button onClick={() => closeLoan(loan, "替代管撤走")}>
                    撤走替代管
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="heading">
          <div>
            <p>历史</p>
            <h2>已结束的借用</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>管位</th>
                <th>原管</th>
                <th>替代管</th>
                <th>送修去向</th>
                <th>送修前旧值</th>
                <th>送修时间</th>
                <th>结局</th>
                <th>结束时间</th>
              </tr>
            </thead>
            <tbody>
              {closed.map((loan) => {
                const position = positionById(state, loan.positionId);
                const original = pipeById(state, loan.originalPipeId);
                const spare = pipeById(state, loan.sparePipeId);
                return (
                  <tr key={loan.id}>
                    <td>{position ? positionPath(state, position) : "—"}</td>
                    <td>
                      <code>{original?.code}</code>
                    </td>
                    <td>
                      <code>{spare?.code}</code>
                    </td>
                    <td>{loan.destination}</td>
                    <td>
                      <PreRepairValue store={store} loan={loan} />
                    </td>
                    <td>{fmtDateTime(loan.sentAt)}</td>
                    <td>
                      <span className="badge muted">{loan.closeAction}</span>
                    </td>
                    <td>{fmtDateTime(loan.closedAt)}</td>
                  </tr>
                );
              })}
              {closed.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    暂无历史借用
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
