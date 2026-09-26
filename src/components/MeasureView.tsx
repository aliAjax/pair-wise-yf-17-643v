import { useState } from "react";
import {
  abnormalReasons,
  CENTS_LIMIT,
  fmtCents,
  fmtDateTime,
  isAbnormal,
  nowLocalInput,
  pipeById,
  positionById,
  positionPath,
} from "../domain";
import type { OrganStore } from "../store";
import { REED_OPTIONS, type ReedStatus, type StopKind } from "../types";
import { PipeKindBadge } from "./badges";

const KIND_FILTERS: Array<StopKind | "全部"> = ["全部", "主音栓", "簧片音栓", "混合音栓"];

export default function MeasureView({ store }: { store: OrganStore }) {
  const { state } = store;
  const [positionId, setPositionId] = useState(
    state.positions.find((p) => p.currentPipeId)?.id ?? "",
  );
  const [cents, setCents] = useState("0");
  const [temperature, setTemperature] = useState("21.5");
  const [humidity, setHumidity] = useState("45");
  const [reed, setReed] = useState<ReedStatus>("正常");
  const [note, setNote] = useState("");
  const [measuredAt, setMeasuredAt] = useState(nowLocalInput());
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<(typeof KIND_FILTERS)[number]>("全部");

  const position = positionById(state, positionId);
  const currentPipe = position ? pipeById(state, position.currentPipeId) : null;

  const submit = () => {
    const at = new Date(measuredAt);
    if (Number.isNaN(at.getTime())) {
      setError("请填写有效的测量时间");
      return;
    }
    const err = store.addMeasurement({
      positionId,
      cents: Number(cents),
      temperature: Number(temperature),
      humidity: Number(humidity),
      reed,
      note,
      measuredAt: at.toISOString(),
    });
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setCents("0");
    setNote("");
    setMeasuredAt(nowLocalInput());
  };

  const stopKindOf = (posId: string) => {
    const pos = positionById(state, posId);
    return state.stops.find((s) => s.id === pos?.stopId)?.kind;
  };

  const rows = state.measurements
    .filter((m) => kindFilter === "全部" || stopKindOf(m.positionId) === kindFilter)
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));

  return (
    <section className="stack">
      <div className="panel">
        <div className="heading">
          <div>
            <p>调音测量</p>
            <h2>新增测量（记入当前安装管）</h2>
          </div>
        </div>
        <div className="form-grid">
          <label>
            <span>管位</span>
            <select value={positionId} onChange={(e) => setPositionId(e.target.value)}>
              {state.positions.map((p) => {
                const pipe = pipeById(state, p.currentPipeId);
                return (
                  <option key={p.id} value={p.id} disabled={!p.currentPipeId}>
                    {positionPath(state, p)}
                    {p.currentPipeId ? `（当前管 ${pipe?.code}）` : "（空缺）"}
                  </option>
                );
              })}
            </select>
          </label>
          <label>
            <span>标称音高</span>
            <input value={position?.pitch ?? "—"} readOnly />
          </label>
          <label>
            <span>音分偏差（¢）</span>
            <input
              type="number"
              step="1"
              value={cents}
              onChange={(e) => setCents(e.target.value)}
            />
          </label>
          <label>
            <span>温度（℃）</span>
            <input
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
          </label>
          <label>
            <span>湿度（%）</span>
            <input
              type="number"
              step="1"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
            />
          </label>
          <label>
            <span>簧片状态</span>
            <select value={reed} onChange={(e) => setReed(e.target.value as ReedStatus)}>
              {REED_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>测量时间</span>
            <input
              type="datetime-local"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
            />
          </label>
          <label>
            <span>维修备注</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="选填"
            />
          </label>
        </div>
        <p className="muted">
          {currentPipe ? (
            <>
              本次结果将记入当前安装管 <code>{currentPipe.code}</code>（{currentPipe.kind}
              ）名下；历史结果仍归属测量时实际安装的音管，不会串到原管或备用管。
            </>
          ) : (
            "该管位当前空缺，请先在「音栓与管位」页安装音管。"
          )}
        </p>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions left">
          <button className="primary" onClick={submit} disabled={!currentPipe}>
            保存测量
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="heading">
          <div>
            <p>调音偏差表</p>
            <h2>测量台账（按音管归属）</h2>
          </div>
          <div className="chips">
            {KIND_FILTERS.map((k) => (
              <button
                key={k}
                className={kindFilter === k ? "chip-active" : ""}
                onClick={() => setKindFilter(k)}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>时间</th>
                <th>管位</th>
                <th>音管</th>
                <th>音高</th>
                <th>音分偏差</th>
                <th>判定</th>
                <th>温度/湿度</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const pos = positionById(state, m.positionId);
                const pipe = pipeById(state, m.pipeId);
                const isCurrent = pos?.currentPipeId === m.pipeId;
                const bad = isAbnormal(m);
                return (
                  <tr key={m.id} className={bad ? "row-abnormal" : ""}>
                    <td>{fmtDateTime(m.measuredAt)}</td>
                    <td>{pos ? positionPath(state, pos) : "—"}</td>
                    <td>
                      <code>{pipe?.code ?? "?"}</code> {pipe && <PipeKindBadge kind={pipe.kind} />}
                      {!isCurrent && <span className="badge muted">非当前管</span>}
                      {pipe?.status === "送修中" && (
                        <span className="badge pending">送修中</span>
                      )}
                    </td>
                    <td>{m.pitch}</td>
                    <td
                      className={
                        Math.abs(m.cents) > CENTS_LIMIT ? "cents-bad" : "cents-ok"
                      }
                    >
                      {fmtCents(m.cents)}¢
                    </td>
                    <td>
                      {bad ? (
                        <span className="badge bad">异常</span>
                      ) : (
                        <span className="badge ok">正常</span>
                      )}
                      {bad && (
                        <span className="cell-sub">{abnormalReasons(m).join("；")}</span>
                      )}
                    </td>
                    <td>
                      {m.temperature}℃ / {m.humidity}%
                    </td>
                    <td>{m.note || "—"}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="muted">
                    暂无测量记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="heading">
          <div>
            <p>温湿度记录</p>
            <h2>环境记录</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>时间</th>
                <th>管位</th>
                <th>记录时音管</th>
                <th>温度</th>
                <th>湿度</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const pos = positionById(state, m.positionId);
                const pipe = pipeById(state, m.pipeId);
                return (
                  <tr key={m.id}>
                    <td>{fmtDateTime(m.measuredAt)}</td>
                    <td>{pos ? positionPath(state, pos) : "—"}</td>
                    <td>
                      <code>{pipe?.code ?? "?"}</code>
                    </td>
                    <td>{m.temperature}℃</td>
                    <td>{m.humidity}%</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    暂无环境记录
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
