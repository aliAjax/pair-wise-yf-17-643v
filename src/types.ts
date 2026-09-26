// 实物音管：原管或备用管，一支管同一时刻只装在一个管位上
export type PipeKind = "original" | "spare";
export type PipeStatus = "installed" | "repair" | "stock";

export interface Pipe {
  id: string;
  code: string; // 实物编号，如 P-TR-041 / 备用 S-07
  kind: PipeKind;
  status: PipeStatus;
  repairDestination?: string; // 送修去向（仅在送修期间有效）
}

// 管位：音栓上的一个固定位置，调音结论挂在管位上
export type Conclusion = "正常" | "异常" | "待复核";

export interface PipePosition {
  id: string;
  venue: string; // 场馆名称（教堂 / 音乐厅）
  stop: string; // 音栓
  positionNo: string; // 管位编号，如 C#4
  nominalPitch: string; // 标称音高
  currentPipeId: string | null; // 当前安装的管；null 表示管位空缺
  conclusion: Conclusion;
}

// 测量记录：永远跟随“测量那一刻”安装在管位上的管
export interface Measurement {
  id: string;
  positionId: string;
  pipeId: string;
  date: string; // YYYY-MM-DD
  pitch: string; // 实测音高
  deviationCents: number; // 音分偏差
  temperature: number; // 温度 ℃
  humidity: number; // 湿度 %
  reedStatus: string; // 簧片状态
  note: string; // 维修备注
}

// 借用流转事件：送修 / 原管回装 / 撤走替代管
export type BorrowEventType = "send-repair" | "reinstall-original" | "remove-spare";

export interface BorrowEvent {
  id: string;
  positionId: string;
  type: BorrowEventType;
  date: string;
  outPipeId: string | null; // 卸下的管
  inPipeId: string | null; // 装上的管
  repairDestination?: string;
  note: string;
}

export interface Ledger {
  positions: PipePosition[];
  pipes: Pipe[];
  measurements: Measurement[];
  events: BorrowEvent[];
}
