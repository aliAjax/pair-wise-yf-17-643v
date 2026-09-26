import type {
  AppState,
  Conclusion,
  Loan,
  Measurement,
  Pipe,
  Position,
  ReedStatus,
} from "./types";

/** 音分偏差超限阈值（¢） */
export const CENTS_LIMIT = 8;

export class DomainError extends Error {}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function fmtCents(cents: number): string {
  return `${cents > 0 ? "+" : ""}${cents}`;
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function nowLocalInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------------- 查询 ---------------- */

export function pipeById(state: AppState, id: string | null | undefined): Pipe | null {
  if (!id) return null;
  return state.pipes.find((p) => p.id === id) ?? null;
}

export function positionById(state: AppState, id: string | null | undefined): Position | null {
  if (!id) return null;
  return state.positions.find((p) => p.id === id) ?? null;
}

export function positionPath(state: AppState, position: Position): string {
  const stop = state.stops.find((s) => s.id === position.stopId);
  const venue = state.venues.find((v) => v.id === stop?.venueId);
  return [venue?.name, stop?.name, position.label].filter(Boolean).join(" / ");
}

export function activeLoanOf(state: AppState, positionId: string): Loan | null {
  return state.loans.find((l) => l.positionId === positionId && l.status === "借用中") ?? null;
}

export function latestLoanOf(state: AppState, positionId: string): Loan | null {
  const loans = state.loans
    .filter((l) => l.positionId === positionId)
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  return loans.find((l) => l.status === "借用中") ?? loans[0] ?? null;
}

export function lastMeasurementOf(
  measurements: Measurement[],
  positionId: string,
  pipeId: string,
): Measurement | null {
  const list = measurements
    .filter((m) => m.positionId === positionId && m.pipeId === pipeId)
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
  return list[0] ?? null;
}

/**
 * 当前安装管在「本次安装之后」的测量。
 * 调音结论与异常判断只跟随这部分数据，送修前/借用期间的旧结果不参与。
 */
export function currentPipeMeasurements(
  position: Position,
  measurements: Measurement[],
): Measurement[] {
  if (!position.currentPipeId) return [];
  return measurements
    .filter((m) => m.positionId === position.id && m.pipeId === position.currentPipeId)
    .filter((m) => !position.installedAt || m.measuredAt >= position.installedAt)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt) || a.id.localeCompare(b.id));
}

export function isAbnormal(m: Measurement): boolean {
  return Math.abs(m.cents) > CENTS_LIMIT || m.reed !== "正常";
}

export function abnormalReasons(m: Measurement): string[] {
  const reasons: string[] = [];
  if (Math.abs(m.cents) > CENTS_LIMIT) {
    reasons.push(`音分偏差 ${fmtCents(m.cents)}¢ 超出 ±${CENTS_LIMIT}¢`);
  }
  if (m.reed !== "正常") reasons.push(`簧片状态「${m.reed}」`);
  return reasons;
}

/**
 * 管位调音结论（按管位独立推导）：
 * - 管位空缺（替代管已撤走）→ 待复核
 * - 当前管在本安装周期内无测量 → 待复核（换管/回装后），从未测过则未测量
 * - 否则以当前管最近一次测量判定 正常 / 异常
 * 因为只读本管位的数据，回装/撤管天然只影响本管位，其他管位结论照常保留。
 */
export function conclusionOf(position: Position, measurements: Measurement[]): Conclusion {
  if (!position.currentPipeId) return "待复核";
  const valid = currentPipeMeasurements(position, measurements);
  if (valid.length === 0) {
    return measurements.some((m) => m.positionId === position.id) ? "待复核" : "未测量";
  }
  return isAbnormal(valid[valid.length - 1]) ? "异常" : "正常";
}

/* ---------------- 业务操作（纯函数，校验失败抛 DomainError） ---------------- */

export interface SendToRepairInput {
  positionId: string;
  sparePipeId: string;
  destination: string;
  reason: string;
  sentAt: string;
}

/** 停用原管：登记送修去向与同音高替代管，替代管立即上位 */
export function sendToRepair(state: AppState, input: SendToRepairInput): AppState {
  const position = positionById(state, input.positionId);
  if (!position) throw new DomainError("管位不存在");
  if (!position.currentPipeId) throw new DomainError("该管位当前空缺，没有可停用的原管");
  if (activeLoanOf(state, position.id)) {
    throw new DomainError("该管位已有进行中的送修/借用记录");
  }
  const original = pipeById(state, position.currentPipeId);
  if (!original || original.kind !== "原管") {
    throw new DomainError("当前安装的不是原管，无需送修登记");
  }
  const spare = pipeById(state, input.sparePipeId);
  if (!spare) throw new DomainError("请选择替代管");
  if (spare.status !== "备用库存") {
    throw new DomainError(`替代管 ${spare.code} 当前状态为「${spare.status}」，不可借用`);
  }
  if (spare.pitch !== position.pitch) {
    throw new DomainError(`替代管音高 ${spare.pitch} 与管位标称音高 ${position.pitch} 不符`);
  }
  if (!input.destination.trim()) throw new DomainError("请填写送修去向");
  if (Number.isNaN(new Date(input.sentAt).getTime())) {
    throw new DomainError("请填写有效的送修时间");
  }

  const preRepair = lastMeasurementOf(state.measurements, position.id, original.id);
  const loan: Loan = {
    id: uid("loan"),
    positionId: position.id,
    originalPipeId: original.id,
    sparePipeId: spare.id,
    destination: input.destination.trim(),
    reason: input.reason.trim() || "管身开裂",
    sentAt: input.sentAt,
    preRepairMeasurementId: preRepair?.id ?? null,
    status: "借用中",
    closedAt: null,
    closeAction: null,
  };

  return {
    ...state,
    pipes: state.pipes.map((p) =>
      p.id === original.id
        ? { ...p, status: "送修中" }
        : p.id === spare.id
          ? { ...p, status: "在装" }
          : p,
    ),
    positions: state.positions.map((p) =>
      p.id === position.id
        ? { ...p, currentPipeId: spare.id, installedAt: input.sentAt }
        : p,
    ),
    loans: [...state.loans, loan],
  };
}

/** 原管回装：替代管撤回库存，仅本管位结论转入待复核 */
export function reinstallOriginal(state: AppState, loanId: string, at: string): AppState {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan || loan.status !== "借用中") {
    throw new DomainError("借用记录不存在或已结束");
  }
  return {
    ...state,
    pipes: state.pipes.map((p) =>
      p.id === loan.originalPipeId
        ? { ...p, status: "在装" }
        : p.id === loan.sparePipeId
          ? { ...p, status: "备用库存" }
          : p,
    ),
    positions: state.positions.map((p) =>
      p.id === loan.positionId
        ? { ...p, currentPipeId: loan.originalPipeId, installedAt: at }
        : p,
    ),
    loans: state.loans.map((l) =>
      l.id === loan.id
        ? { ...l, status: "已结束", closedAt: at, closeAction: "原管回装" }
        : l,
    ),
  };
}

/** 撤走替代管：管位暂时空缺，仅本管位结论转入待复核 */
export function removeSpare(state: AppState, loanId: string, at: string): AppState {
  const loan = state.loans.find((l) => l.id === loanId);
  if (!loan || loan.status !== "借用中") {
    throw new DomainError("借用记录不存在或已结束");
  }
  return {
    ...state,
    pipes: state.pipes.map((p) =>
      p.id === loan.sparePipeId ? { ...p, status: "备用库存" } : p,
    ),
    positions: state.positions.map((p) =>
      p.id === loan.positionId
        ? { ...p, currentPipeId: null, installedAt: null }
        : p,
    ),
    loans: state.loans.map((l) =>
      l.id === loan.id
        ? { ...l, status: "已结束", closedAt: at, closeAction: "替代管撤走" }
        : l,
    ),
  };
}

/** 空缺管位装管：可装同音高库存备用管，或本管位送修返还的原管；装后本管位待复核 */
export function installPipe(state: AppState, positionId: string, pipeId: string, at: string): AppState {
  const position = positionById(state, positionId);
  if (!position) throw new DomainError("管位不存在");
  if (position.currentPipeId) throw new DomainError("该管位已有在装音管");
  const pipe = pipeById(state, pipeId);
  if (!pipe) throw new DomainError("请选择要安装的音管");
  const isOriginalReturn =
    pipe.kind === "原管" && pipe.homePositionId === position.id && pipe.status !== "在装";
  const isStockSpare = pipe.kind === "备用管" && pipe.status === "备用库存";
  if (!isOriginalReturn && !isStockSpare) {
    throw new DomainError(`音管 ${pipe.code} 当前状态为「${pipe.status}」，不可安装到本管位`);
  }
  if (pipe.pitch !== position.pitch) {
    throw new DomainError(`音管音高 ${pipe.pitch} 与管位标称音高 ${position.pitch} 不符`);
  }
  return {
    ...state,
    pipes: state.pipes.map((p) => (p.id === pipe.id ? { ...p, status: "在装" } : p)),
    positions: state.positions.map((p) =>
      p.id === position.id ? { ...p, currentPipeId: pipe.id, installedAt: at } : p,
    ),
  };
}

export interface MeasurementInput {
  positionId: string;
  cents: number;
  temperature: number;
  humidity: number;
  reed: ReedStatus;
  note: string;
  measuredAt: string;
}

/** 新增测量：结果一律记在当前安装的管名下 */
export function addMeasurement(state: AppState, input: MeasurementInput): AppState {
  const position = positionById(state, input.positionId);
  if (!position) throw new DomainError("管位不存在");
  if (!position.currentPipeId) {
    throw new DomainError("该管位当前空缺，请先安装音管再测量");
  }
  if (!Number.isFinite(input.cents)) throw new DomainError("请填写有效的音分偏差");
  if (!Number.isFinite(input.temperature) || !Number.isFinite(input.humidity)) {
    throw new DomainError("请填写有效的温度与湿度");
  }
  if (Number.isNaN(new Date(input.measuredAt).getTime())) {
    throw new DomainError("请填写有效的测量时间");
  }

  const measurement: Measurement = {
    id: uid("m"),
    positionId: position.id,
    pipeId: position.currentPipeId, // 跟随当前安装的管
    pitch: position.pitch,
    cents: input.cents,
    temperature: input.temperature,
    humidity: input.humidity,
    reed: input.reed,
    note: input.note.trim(),
    measuredAt: input.measuredAt,
  };
  return { ...state, measurements: [...state.measurements, measurement] };
}

/* ---------------- 单次维护报告 ---------------- */

export interface ReportTimelineItem {
  at: string;
  text: string;
}

export interface PositionReport {
  position: Position;
  venueName: string;
  stopName: string;
  stopKind: string;
  currentPipe: Pipe | null;
  conclusion: Conclusion;
  validMeasurements: Measurement[];
  latest: Measurement | null;
  loan: Loan | null;
  originalPipe: Pipe | null;
  sparePipe: Pipe | null;
  preRepair: Measurement | null;
  history: Measurement[];
  timeline: ReportTimelineItem[];
}

export function buildReport(state: AppState, positionId: string): PositionReport {
  const position = positionById(state, positionId);
  if (!position) throw new DomainError("管位不存在");
  const stop = state.stops.find((s) => s.id === position.stopId);
  const venue = state.venues.find((v) => v.id === stop?.venueId);
  const currentPipe = pipeById(state, position.currentPipeId);
  const validMeasurements = currentPipeMeasurements(position, state.measurements);
  const latest = validMeasurements.length ? validMeasurements[validMeasurements.length - 1] : null;
  const loan = latestLoanOf(state, positionId);
  const originalPipe = loan ? pipeById(state, loan.originalPipeId) : null;
  const sparePipe = loan ? pipeById(state, loan.sparePipeId) : null;
  const preRepair = loan?.preRepairMeasurementId
    ? state.measurements.find((m) => m.id === loan.preRepairMeasurementId) ?? null
    : null;
  const history = state.measurements
    .filter((m) => m.positionId === positionId)
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));

  const timeline: ReportTimelineItem[] = [];
  const loans = state.loans
    .filter((l) => l.positionId === positionId)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  for (const l of loans) {
    const op = pipeById(state, l.originalPipeId);
    const sp = pipeById(state, l.sparePipeId);
    timeline.push({
      at: l.sentAt,
      text: `原管 ${op?.code ?? "?"} 停用送修（去向：${l.destination}；原因：${l.reason}），同音高备用管 ${sp?.code ?? "?"} 临时上位`,
    });
    if (l.closedAt && l.closeAction) {
      timeline.push({
        at: l.closedAt,
        text:
          l.closeAction === "原管回装"
            ? `原管 ${op?.code ?? "?"} 修复回装，备用管 ${sp?.code ?? "?"} 撤回库存；本管位结论转入待复核`
            : `备用管 ${sp?.code ?? "?"} 撤走，管位暂时空缺；本管位结论转入待复核`,
      });
    }
  }

  return {
    position,
    venueName: venue?.name ?? "—",
    stopName: stop?.name ?? "—",
    stopKind: stop?.kind ?? "—",
    currentPipe,
    conclusion: conclusionOf(position, state.measurements),
    validMeasurements,
    latest,
    loan,
    originalPipe,
    sparePipe,
    preRepair,
    history,
    timeline,
  };
}
