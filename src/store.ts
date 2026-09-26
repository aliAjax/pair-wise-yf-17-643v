import type {
  BorrowEvent,
  Ledger,
  Measurement,
  Pipe,
  PipePosition,
} from "./types";

// 数据只存浏览器 localStorage，不上传任何服务器
export const STORAGE_KEY = "hxyfront-62005-ledger";

// 异常判定阈值：音分偏差绝对值超过 ±8 音分即判异常
export const DEVIATION_LIMIT = 8;

export function uid(prefix: string): string {
  return (
    prefix +
    "-" +
    Math.random().toString(36).slice(2, 8) +
    Date.now().toString(36).slice(-4)
  );
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isAbnormal(m: Measurement): boolean {
  return Math.abs(m.deviationCents) > DEVIATION_LIMIT;
}

function seedLedger(): Ledger {
  const pipes: Pipe[] = [
    { id: "pipe-tr-041", code: "P-TR-041", kind: "original", status: "installed" },
    { id: "pipe-pr-033", code: "P-PR-033", kind: "original", status: "installed" },
    {
      id: "pipe-bd-012",
      code: "P-BD-012",
      kind: "original",
      status: "repair",
      repairDestination: "沪上管风琴工坊",
    },
    { id: "pipe-s-07", code: "备用 S-07", kind: "spare", status: "installed" },
    { id: "pipe-s-11", code: "备用 S-11", kind: "spare", status: "stock" },
  ];

  const positions: PipePosition[] = [
    {
      id: "pos-1",
      venue: "St.Mary 教堂",
      stop: "Trumpet 8'",
      positionNo: "C#4",
      nominalPitch: "C#4",
      currentPipeId: "pipe-tr-041",
      conclusion: "异常",
    },
    {
      id: "pos-2",
      venue: "ConcertHall A",
      stop: "Principal 4'",
      positionNo: "G3",
      nominalPitch: "G3",
      currentPipeId: "pipe-pr-033",
      conclusion: "正常",
    },
    {
      id: "pos-3",
      venue: "Abbey Room",
      stop: "Bourdon 16'",
      positionNo: "F2",
      nominalPitch: "F2",
      currentPipeId: "pipe-s-07",
      conclusion: "待复核",
    },
  ];

  const measurements: Measurement[] = [
    {
      id: "m-1",
      positionId: "pos-1",
      pipeId: "pipe-tr-041",
      date: "2026-09-20",
      pitch: "C#4",
      deviationCents: 9,
      temperature: 22.5,
      humidity: 47,
      reedStatus: "需微调",
      note: "簧片需微调",
    },
    {
      id: "m-2",
      positionId: "pos-2",
      pipeId: "pipe-pr-033",
      date: "2026-09-20",
      pitch: "G3",
      deviationCents: -3,
      temperature: 22.5,
      humidity: 47,
      reedStatus: "正常",
      note: "正常",
    },
    {
      id: "m-3",
      positionId: "pos-3",
      pipeId: "pipe-bd-012",
      date: "2026-09-12",
      pitch: "F2",
      deviationCents: -12,
      temperature: 21.0,
      humidity: 55,
      reedStatus: "正常",
      note: "管体开裂，标记复检",
    },
    {
      id: "m-4",
      positionId: "pos-3",
      pipeId: "pipe-s-07",
      date: "2026-09-21",
      pitch: "F2",
      deviationCents: 2,
      temperature: 22.8,
      humidity: 46,
      reedStatus: "正常",
      note: "备用管初测",
    },
  ];

  const events: BorrowEvent[] = [
    {
      id: "ev-1",
      positionId: "pos-3",
      type: "send-repair",
      date: "2026-09-15",
      outPipeId: "pipe-bd-012",
      inPipeId: "pipe-s-07",
      repairDestination: "沪上管风琴工坊",
      note: "管体开裂送修，同音高备用管临时代替",
    },
  ];

  return { positions, pipes, measurements, events };
}

export function loadLedger(): Ledger {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Ledger;
      if (parsed.positions && parsed.pipes && parsed.measurements && parsed.events) {
        return parsed;
      }
    }
  } catch {
    // 本地数据损坏时回退到示例数据
  }
  return seedLedger();
}

export function saveLedger(ledger: Ledger): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
}

export function resetLedger(): Ledger {
  const ledger = seedLedger();
  saveLedger(ledger);
  return ledger;
}

// ---------- 查询辅助 ----------

export function pipeById(ledger: Ledger, id: string | null): Pipe | undefined {
  return id ? ledger.pipes.find((p) => p.id === id) : undefined;
}

export function positionById(ledger: Ledger, id: string): PipePosition | undefined {
  return ledger.positions.find((p) => p.id === id);
}

/** 管位当前安装管的最近一次测量（异常判断跟随当前管） */
export function latestMeasurementOnPipe(
  ledger: Ledger,
  positionId: string,
  pipeId: string | null
): Measurement | undefined {
  if (!pipeId) return undefined;
  return ledger.measurements
    .filter((m) => m.positionId === positionId && m.pipeId === pipeId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

/**
 * 送修前旧值：该管位最近一次送修事件中，被换下原管在送修前的最后一次测量。
 * 没有送修记录时返回 undefined。
 */
export function preRepairMeasurement(
  ledger: Ledger,
  positionId: string
): { event: BorrowEvent; measurement: Measurement } | undefined {
  const event = ledger.events
    .filter((e) => e.positionId === positionId && e.type === "send-repair" && e.outPipeId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!event || !event.outPipeId) return undefined;
  const measurement = ledger.measurements
    .filter((m) => m.positionId === positionId && m.pipeId === event.outPipeId && m.date <= event.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  return measurement ? { event, measurement } : undefined;
}

/** 管位当前是否处于借用状态（装着备用管） */
export function isBorrowed(position: PipePosition, ledger: Ledger): boolean {
  const pipe = pipeById(ledger, position.currentPipeId);
  return pipe?.kind === "spare";
}

/** 该管位处于送修中的原管 */
export function originalInRepair(ledger: Ledger, position: PipePosition): Pipe | undefined {
  const sentIds = ledger.events
    .filter((e) => e.positionId === position.id && e.type === "send-repair" && e.outPipeId)
    .map((e) => e.outPipeId as string);
  return ledger.pipes.find((p) => sentIds.includes(p.id) && p.status === "repair");
}

export function fmtDeviation(cents: number): string {
  return (cents > 0 ? "+" : "") + cents + " cent";
}
