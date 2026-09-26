import type { Conclusion, PipeKind } from "../types";

export function ConclusionBadge({ conclusion }: { conclusion: Conclusion }) {
  const cls =
    conclusion === "正常"
      ? "ok"
      : conclusion === "异常"
        ? "bad"
        : conclusion === "待复核"
          ? "pending"
          : "muted";
  return <span className={`badge ${cls}`}>{conclusion}</span>;
}

export function PipeKindBadge({ kind }: { kind: PipeKind }) {
  return <span className={`badge ${kind === "原管" ? "pipe" : "spare"}`}>{kind}</span>;
}
