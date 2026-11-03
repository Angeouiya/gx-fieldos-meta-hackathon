import { Workspace } from "./Workspace";
import type { RunWorkTask } from "../types";

export function Company({ english = false, onStartPlan, onRunTask, legalBaseUrl }: { english?: boolean; onStartPlan: (prompt: string) => void; onRunTask: RunWorkTask; legalBaseUrl?: string }) {
  return <Workspace id="company" english={english} onStartPlan={onStartPlan} onRunTask={onRunTask} legalBaseUrl={legalBaseUrl} />;
}
