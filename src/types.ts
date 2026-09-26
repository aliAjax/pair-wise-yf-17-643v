export interface Venue {
  id: string;
  name: string;
}

export type StopKind = "主音栓" | "簧片音栓" | "混合音栓";

export interface Stop {
  id: string;
  venueId: string;
  name: string;
  kind: StopKind;
}

export type PipeKind = "原管" | "备用管";
export type PipeStatus = "在装" | "送修中" | "备用库存";

export interface Pipe {
  id: string;
  /** 音管编号，如 TRP8-012-C#4 */
  code: string;
  kind: PipeKind;
  /** 标称音高，如 C#4 */
  pitch: string;
  /** 原管所属管位；备用管为 null */
  homePositionId: string | null;
  status: PipeStatus;
}

export interface Position {
  id: string;
  stopId: string;
  /** 管位号，如 No.12 */
  label: string;
  /** 标称音高 */
  pitch: string;
  /** 当前安装管；空缺时为 null */
  currentPipeId: string | null;
  /** 当前管安装时间：结论有效性的分水岭，此前的测量不计入当前结论 */
  installedAt: string | null;
}

export type ReedStatus = "正常" | "需微调" | "异响" | "失灵";
export const REED_OPTIONS: ReedStatus[] = ["正常", "需微调", "异响", "失灵"];

export interface Measurement {
  id: string;
  positionId: string;
  /** 测量时实际安装的管：结果归属以它为准 */
  pipeId: string;
  pitch: string;
  /** 音分偏差 */
  cents: number;
  temperature: number;
  humidity: number;
  reed: ReedStatus;
  note: string;
  measuredAt: string;
}

export type LoanStatus = "借用中" | "已结束";
export type LoanCloseAction = "原管回装" | "替代管撤走";

export interface Loan {
  id: string;
  positionId: string;
  originalPipeId: string;
  sparePipeId: string;
  /** 送修去向 */
  destination: string;
  reason: string;
  sentAt: string;
  /** 送修前旧值：原管停用前最后一次测量 */
  preRepairMeasurementId: string | null;
  status: LoanStatus;
  closedAt: string | null;
  closeAction: LoanCloseAction | null;
}

export interface AppState {
  version: 1;
  venues: Venue[];
  stops: Stop[];
  positions: Position[];
  pipes: Pipe[];
  loans: Loan[];
  measurements: Measurement[];
}

export type Conclusion = "正常" | "异常" | "待复核" | "未测量";
