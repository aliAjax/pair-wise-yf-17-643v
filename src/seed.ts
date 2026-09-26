import type { AppState, Loan, Measurement, Pipe, Position, Stop, Venue } from "./types";

const venues: Venue[] = [
  { id: "v-stmary", name: "St.Mary 教堂" },
  { id: "v-hall", name: "ConcertHall A 音乐厅" },
];

const stops: Stop[] = [
  { id: "s-trumpet", venueId: "v-stmary", name: "Trumpet 8'", kind: "簧片音栓" },
  { id: "s-principal", venueId: "v-stmary", name: "Principal 4'", kind: "主音栓" },
  { id: "s-bourdon", venueId: "v-hall", name: "Bourdon 16'", kind: "混合音栓" },
];

const positions: Position[] = [
  // Trumpet 8' —— No.12 原管开裂送修，同音高备用管 SP-C#4-03 在装
  {
    id: "pos-t12",
    stopId: "s-trumpet",
    label: "No.12",
    pitch: "C#4",
    currentPipeId: "pipe-sp-cs4-03",
    installedAt: "2026-09-10T09:30:00.000Z",
  },
  {
    id: "pos-t13",
    stopId: "s-trumpet",
    label: "No.13",
    pitch: "D4",
    currentPipeId: "pipe-orig-t13",
    installedAt: "2026-06-01T08:00:00.000Z",
  },
  {
    id: "pos-t14",
    stopId: "s-trumpet",
    label: "No.14",
    pitch: "D#4",
    currentPipeId: "pipe-orig-t14",
    installedAt: "2026-06-01T08:00:00.000Z",
  },
  {
    id: "pos-p05",
    stopId: "s-principal",
    label: "No.05",
    pitch: "G3",
    currentPipeId: "pipe-orig-p05",
    installedAt: "2026-06-01T08:00:00.000Z",
  },
  {
    id: "pos-p06",
    stopId: "s-principal",
    label: "No.06",
    pitch: "G#3",
    currentPipeId: "pipe-orig-p06",
    installedAt: "2026-06-01T08:00:00.000Z",
  },
  // Bourdon 16' —— No.02 原管 09-18 修复回装，新安装周期内尚未复测 → 待复核
  {
    id: "pos-b02",
    stopId: "s-bourdon",
    label: "No.02",
    pitch: "F2",
    currentPipeId: "pipe-orig-b02",
    installedAt: "2026-09-18T10:00:00.000Z",
  },
  {
    id: "pos-b03",
    stopId: "s-bourdon",
    label: "No.03",
    pitch: "F#2",
    currentPipeId: "pipe-orig-b03",
    installedAt: "2026-06-01T08:00:00.000Z",
  },
];

const pipes: Pipe[] = [
  { id: "pipe-orig-t12", code: "TRP8-012-C#4", kind: "原管", pitch: "C#4", homePositionId: "pos-t12", status: "送修中" },
  { id: "pipe-sp-cs4-03", code: "SP-C#4-03", kind: "备用管", pitch: "C#4", homePositionId: null, status: "在装" },
  { id: "pipe-orig-t13", code: "TRP8-013-D4", kind: "原管", pitch: "D4", homePositionId: "pos-t13", status: "在装" },
  { id: "pipe-orig-t14", code: "TRP8-014-D#4", kind: "原管", pitch: "D#4", homePositionId: "pos-t14", status: "在装" },
  { id: "pipe-orig-p05", code: "PRI4-005-G3", kind: "原管", pitch: "G3", homePositionId: "pos-p05", status: "在装" },
  { id: "pipe-orig-p06", code: "PRI4-006-G#3", kind: "原管", pitch: "G#3", homePositionId: "pos-p06", status: "在装" },
  { id: "pipe-orig-b02", code: "BOU16-002-F2", kind: "原管", pitch: "F2", homePositionId: "pos-b02", status: "在装" },
  { id: "pipe-sp-f2-01", code: "SP-F2-01", kind: "备用管", pitch: "F2", homePositionId: null, status: "备用库存" },
  { id: "pipe-orig-b03", code: "BOU16-003-F#2", kind: "原管", pitch: "F#2", homePositionId: "pos-b03", status: "在装" },
  { id: "pipe-sp-cs4-07", code: "SP-C#4-07", kind: "备用管", pitch: "C#4", homePositionId: null, status: "备用库存" },
  { id: "pipe-sp-g3-02", code: "SP-G3-02", kind: "备用管", pitch: "G3", homePositionId: null, status: "备用库存" },
];

const loans: Loan[] = [
  {
    id: "loan-t12",
    positionId: "pos-t12",
    originalPipeId: "pipe-orig-t12",
    sparePipeId: "pipe-sp-cs4-03",
    destination: "华东管风琴修复工坊",
    reason: "管身开裂，焊缝漏气",
    sentAt: "2026-09-10T09:30:00.000Z",
    preRepairMeasurementId: "m-t12-pre",
    status: "借用中",
    closedAt: null,
    closeAction: null,
  },
  {
    id: "loan-b02",
    positionId: "pos-b02",
    originalPipeId: "pipe-orig-b02",
    sparePipeId: "pipe-sp-f2-01",
    destination: "北方管风琴维修站",
    reason: "管脚凹陷",
    sentAt: "2026-08-02T09:00:00.000Z",
    preRepairMeasurementId: "m-b02-pre",
    status: "已结束",
    closedAt: "2026-09-18T10:00:00.000Z",
    closeAction: "原管回装",
  },
];

const measurements: Measurement[] = [
  { id: "m-t12-pre", positionId: "pos-t12", pipeId: "pipe-orig-t12", pitch: "C#4", cents: 14, temperature: 21.5, humidity: 46, reed: "需微调", note: "开裂导致持续偏高，登记送修", measuredAt: "2026-09-09T15:00:00.000Z" },
  { id: "m-t12-a", positionId: "pos-t12", pipeId: "pipe-sp-cs4-03", pitch: "C#4", cents: 3, temperature: 22.0, humidity: 45, reed: "正常", note: "备用管上位初测", measuredAt: "2026-09-11T10:00:00.000Z" },
  { id: "m-t12-b", positionId: "pos-t12", pipeId: "pipe-sp-cs4-03", pitch: "C#4", cents: 4, temperature: 21.8, humidity: 47, reed: "正常", note: "复查稳定", measuredAt: "2026-09-20T10:30:00.000Z" },
  { id: "m-t13", positionId: "pos-t13", pipeId: "pipe-orig-t13", pitch: "D4", cents: -6, temperature: 21.9, humidity: 46, reed: "正常", note: "", measuredAt: "2026-09-20T11:00:00.000Z" },
  { id: "m-t14", positionId: "pos-t14", pipeId: "pipe-orig-t14", pitch: "D#4", cents: 11, temperature: 22.1, humidity: 44, reed: "异响", note: "簧片异响，待安排检修", measuredAt: "2026-09-20T11:20:00.000Z" },
  { id: "m-p05", positionId: "pos-p05", pipeId: "pipe-orig-p05", pitch: "G3", cents: -3, temperature: 21.6, humidity: 48, reed: "正常", note: "", measuredAt: "2026-09-19T14:00:00.000Z" },
  { id: "m-p06", positionId: "pos-p06", pipeId: "pipe-orig-p06", pitch: "G#3", cents: 2, temperature: 21.6, humidity: 48, reed: "正常", note: "", measuredAt: "2026-09-19T14:10:00.000Z" },
  { id: "m-b02-pre", positionId: "pos-b02", pipeId: "pipe-orig-b02", pitch: "F2", cents: -12, temperature: 20.8, humidity: 52, reed: "正常", note: "送修前记录", measuredAt: "2026-08-01T09:30:00.000Z" },
  { id: "m-b02-sp", positionId: "pos-b02", pipeId: "pipe-sp-f2-01", pitch: "F2", cents: -5, temperature: 21.2, humidity: 50, reed: "正常", note: "备用管使用期间", measuredAt: "2026-08-20T10:00:00.000Z" },
  { id: "m-b03", positionId: "pos-b03", pipeId: "pipe-orig-b03", pitch: "F#2", cents: 1, temperature: 21.0, humidity: 51, reed: "正常", note: "", measuredAt: "2026-09-21T09:00:00.000Z" },
];

export function buildSeedState(): AppState {
  return {
    version: 1,
    venues: structuredClone(venues),
    stops: structuredClone(stops),
    positions: structuredClone(positions),
    pipes: structuredClone(pipes),
    loans: structuredClone(loans),
    measurements: structuredClone(measurements),
  };
}
