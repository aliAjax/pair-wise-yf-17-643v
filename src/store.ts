import { useEffect, useState } from "react";
import {
  addMeasurement as opAddMeasurement,
  installPipe as opInstallPipe,
  reinstallOriginal as opReinstallOriginal,
  removeSpare as opRemoveSpare,
  sendToRepair as opSendToRepair,
  type MeasurementInput,
  type SendToRepairInput,
} from "./domain";
import { buildSeedState } from "./seed";
import type { AppState } from "./types";

const STORAGE_KEY = "hxyfront-62005:organ-state:v1";

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (
        parsed &&
        Array.isArray(parsed.positions) &&
        Array.isArray(parsed.pipes) &&
        Array.isArray(parsed.loans)
      ) {
        return parsed;
      }
    }
  } catch {
    /* 本地数据不可用时回退到演示数据 */
  }
  return buildSeedState();
}

export interface OrganStore {
  state: AppState;
  /** 校验失败返回错误文案，成功返回 null */
  addMeasurement: (input: MeasurementInput) => string | null;
  sendToRepair: (input: SendToRepairInput) => string | null;
  reinstallOriginal: (loanId: string) => string | null;
  removeSpare: (loanId: string) => string | null;
  installPipe: (positionId: string, pipeId: string) => string | null;
  resetDemo: () => void;
}

export function useOrganStore(): OrganStore {
  const [state, setState] = useState<AppState>(loadState);

  // 数据只存浏览器：每次变更写回 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* 存储被禁用时仅保留内存态 */
    }
  }, [state]);

  const run = (op: (s: AppState) => AppState): string | null => {
    try {
      setState(op(state));
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  };

  return {
    state,
    addMeasurement: (input) => run((s) => opAddMeasurement(s, input)),
    sendToRepair: (input) => run((s) => opSendToRepair(s, input)),
    reinstallOriginal: (loanId) =>
      run((s) => opReinstallOriginal(s, loanId, new Date().toISOString())),
    removeSpare: (loanId) =>
      run((s) => opRemoveSpare(s, loanId, new Date().toISOString())),
    installPipe: (positionId, pipeId) =>
      run((s) => opInstallPipe(s, positionId, pipeId, new Date().toISOString())),
    resetDemo: () => setState(buildSeedState()),
  };
}
