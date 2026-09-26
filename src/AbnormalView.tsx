import type { Ledger } from "./types";
import {
  DEVIATION_LIMIT,
  fmtDeviation,
  isAbnormal,
  latestMeasurementOnPipe,
  pipeById,
} from "./store";

export default function AbnormalView({ ledger }: { ledger: Ledger }) {
  // 异常判断只跟随当前安装的管：当前管的最近一次测量超限才算异常
  const abnormal = ledger.positions
    .map((pos) => ({
      pos,
      pipe: pipeById(ledger, pos.currentPipeId),
      latest: latestMeasurementOnPipe(ledger, pos.id, pos.currentPipeId),
    }))
    .filter((x) => x.latest && isAbnormal(x.latest));

  const pending = ledger.positions.filter((p) => p.conclusion === "待复核");

  return (
    <>
      <section className="panel">
        <div className="heading">
          <div>
            <p>异常音管标记</p>
            <h2>当前管偏差超限（±{DEVIATION_LIMIT} cent）· {abnormal.length} 支</h2>
          </div>
        </div>
        {abnormal.length === 0 && <p className="hint">当前安装的管均无超限偏差。</p>}
        <div className="records">
          {abnormal.map(({ pos, pipe, latest }) => (
            <article key={pos.id}>
              <b>异</b>
              <div>
                <h3>
                  {pos.venue} · {pos.stop} · {pos.positionNo}
                </h3>
                <p>
                  当前管：{pipe?.code ?? "—"}（{pipe?.kind === "spare" ? "备用管" : "原管"}）｜
                  {latest!.date} 偏差 {fmtDeviation(latest!.deviationCents)} ｜ 簧片：
                  {latest!.reedStatus} ｜ 备注：{latest!.note || "—"}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="heading">
          <div>
            <p>换管影响</p>
            <h2>待复核管位 · {pending.length} 个</h2>
          </div>
        </div>
        {pending.length === 0 && <p className="hint">没有待复核的管位。</p>}
        <div className="records">
          {pending.map((pos) => {
            const pipe = pipeById(ledger, pos.currentPipeId);
            return (
              <article key={pos.id}>
                <b>核</b>
                <div>
                  <h3>
                    {pos.venue} · {pos.stop} · {pos.positionNo}
                  </h3>
                  <p>
                    刚发生过换管，需对当前管（{pipe ? pipe.code : "管位空缺"}）重新测量后才能给出结论。
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
