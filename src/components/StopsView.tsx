import { useState } from "react";
import {
  activeLoanOf,
  conclusionOf,
  currentPipeMeasurements,
  fmtCents,
  fmtDateTime,
  nowLocalInput,
  pipeById,
} from "../domain";
import type { OrganStore } from "../store";
import type { Position } from "../types";
import { ConclusionBadge, PipeKindBadge } from "./badges";

type ModalState = { kind: "repair" | "install"; positionId: string } | null;

export default function StopsView({ store }: { store: OrganStore }) {
  const { state } = store;
  const [modal, setModal] = useState<ModalState>(null);
  const modalPosition = modal
    ? state.positions.find((p) => p.id === modal.positionId) ?? null
    : null;

  const closeLoan = (loanId: string, action: "原管回装" | "替代管撤走") => {
    const hint =
      action === "原管回装"
        ? "确认原管已修复并回装？替代管将撤回备用库存，本管位调音结论转为「待复核」，其他管位不受影响。"
        : "确认撤走替代管？管位将暂时空缺，本管位调音结论转为「待复核」，其他管位不受影响。";
    if (!window.confirm(hint)) return;
    const err =
      action === "原管回装"
        ? store.reinstallOriginal(loanId)
        : store.removeSpare(loanId);
    if (err) window.alert(err);
  };

  return (
    <section className="stack">
      {state.venues.map((venue) => (
        <div className="panel" key={venue.id}>
          <div className="heading">
            <div>
              <p>场馆</p>
              <h2>{venue.name}</h2>
            </div>
          </div>
          {state.stops
            .filter((s) => s.venueId === venue.id)
            .map((stop) => (
              <div className="stop-block" key={stop.id}>
                <div className="stop-head">
                  <h3>{stop.name}</h3>
                  <span className="badge muted">{stop.kind}</span>
                </div>
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>管位</th>
                        <th>标称音高</th>
                        <th>当前安装管</th>
                        <th>安装时间</th>
                        <th>当前管最近测量</th>
                        <th>调音结论</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.positions
                        .filter((p) => p.stopId === stop.id)
                        .map((position) => {
                          const pipe = pipeById(state, position.currentPipeId);
                          const loan = activeLoanOf(state, position.id);
                          const valid = currentPipeMeasurements(
                            position,
                            state.measurements,
                          );
                          const latest = valid.length ? valid[valid.length - 1] : null;
                          return (
                            <tr key={position.id}>
                              <td>
                                <strong>{position.label}</strong>
                              </td>
                              <td>{position.pitch}</td>
                              <td>
                                {pipe ? (
                                  <>
                                    <code>{pipe.code}</code>{" "}
                                    <PipeKindBadge kind={pipe.kind} />
                                    {loan && (
                                      <span className="cell-sub">
                                        原管送修中 · 去向：{loan.destination}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="muted">空缺（替代管已撤走）</span>
                                )}
                              </td>
                              <td>{fmtDateTime(position.installedAt)}</td>
                              <td>
                                {latest
                                  ? `${fmtCents(latest.cents)}¢ · ${fmtDateTime(latest.measuredAt)}`
                                  : "—"}
                              </td>
                              <td>
                                <ConclusionBadge
                                  conclusion={conclusionOf(
                                    position,
                                    state.measurements,
                                  )}
                                />
                              </td>
                              <td className="row-actions">
                                {!position.currentPipeId && (
                                  <button
                                    onClick={() =>
                                      setModal({ kind: "install", positionId: position.id })
                                    }
                                  >
                                    安装音管
                                  </button>
                                )}
                                {loan && (
                                  <>
                                    <button
                                      className="primary"
                                      onClick={() => closeLoan(loan.id, "原管回装")}
                                    >
                                      原管回装
                                    </button>
                                    <button
                                      onClick={() => closeLoan(loan.id, "替代管撤走")}
                                    >
                                      撤走替代管
                                    </button>
                                  </>
                                )}
                                {!loan && pipe?.kind === "原管" && (
                                  <button
                                    className="primary"
                                    onClick={() =>
                                      setModal({ kind: "repair", positionId: position.id })
                                    }
                                  >
                                    送修登记
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      ))}

      {modal?.kind === "repair" && modalPosition && (
        <RepairModal store={store} position={modalPosition} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "install" && modalPosition && (
        <InstallModal store={store} position={modalPosition} onClose={() => setModal(null)} />
      )}
    </section>
  );
}

function RepairModal({
  store,
  position,
  onClose,
}: {
  store: OrganStore;
  position: Position;
  onClose: () => void;
}) {
  const { state } = store;
  const original = pipeById(state, position.currentPipeId);
  const candidates = state.pipes.filter(
    (p) => p.kind === "备用管" && p.status === "备用库存" && p.pitch === position.pitch,
  );
  const [spareId, setSpareId] = useState(candidates[0]?.id ?? "");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("管身开裂");
  const [sentAt, setSentAt] = useState(nowLocalInput());
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const at = new Date(sentAt);
    if (Number.isNaN(at.getTime())) {
      setError("请填写有效的送修时间");
      return;
    }
    const err = store.sendToRepair({
      positionId: position.id,
      sparePipeId: spareId,
      destination,
      reason,
      sentAt: at.toISOString(),
    });
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          送修登记 · {position.label}（{position.pitch}）
        </h3>
        <p className="muted">
          停用原管 <code>{original?.code}</code> 并登记送修去向；同音高备用管临时上位后，
          后续测量与异常判断将跟随替代管，原管名下保留送修前旧值。
        </p>
        {candidates.length === 0 ? (
          <p className="error">备用库存中没有音高 {position.pitch} 的备用管，无法登记借用。</p>
        ) : (
          <div className="form-grid">
            <label>
              <span>替代管（同音高备用管）</span>
              <select value={spareId} onChange={(e) => setSpareId(e.target.value)}>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}（库存）
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>送修去向 *</span>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="如：华东管风琴修复工坊"
              />
            </label>
            <label>
              <span>送修原因</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <label>
              <span>送修时间</span>
              <input
                type="datetime-local"
                value={sentAt}
                onChange={(e) => setSentAt(e.target.value)}
              />
            </label>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          {candidates.length > 0 && (
            <button className="primary" onClick={submit}>
              登记并换上替代管
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InstallModal({
  store,
  position,
  onClose,
}: {
  store: OrganStore;
  position: Position;
  onClose: () => void;
}) {
  const { state } = store;
  const originals = state.pipes.filter(
    (p) =>
      p.kind === "原管" &&
      p.homePositionId === position.id &&
      p.status !== "在装",
  );
  const spares = state.pipes.filter(
    (p) => p.kind === "备用管" && p.status === "备用库存" && p.pitch === position.pitch,
  );
  const candidates = [...originals, ...spares];
  const [pipeId, setPipeId] = useState(candidates[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const err = store.installPipe(position.id, pipeId);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>
          安装音管 · {position.label}（{position.pitch}）
        </h3>
        <p className="muted">
          装管后本管位调音结论为「待复核」，对当前管复测后自动更新；其他管位不受影响。
        </p>
        {candidates.length === 0 ? (
          <p className="error">
            没有可安装的同音高音管（备用库存为空，本管位原管仍在送修中）。
          </p>
        ) : (
          <div className="form-grid">
            <label>
              <span>选择音管</span>
              <select value={pipeId} onChange={(e) => setPipeId(e.target.value)}>
                {originals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}（本管位原管 · 送修返还）
                  </option>
                ))}
                {spares.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}（备用管 · 库存）
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          {candidates.length > 0 && (
            <button className="primary" onClick={submit}>
              安装
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
