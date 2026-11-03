import type { GXSystemInfo, RunWorkTask } from "../types";
import { Workspace } from "./Workspace";

interface OfficeProps {
  english?: boolean;
  runtime: "web" | "desktop";
  systemInfo?: GXSystemInfo | null;
  onStartPlan: (prompt: string) => void;
  onRunTask: RunWorkTask;
  legalBaseUrl?: string;
}

export function Office({ english = false, runtime, systemInfo, onStartPlan, onRunTask, legalBaseUrl }: OfficeProps) {
  const status = systemInfo ? (
    <p className="gx-runtime-status" role="status">
      <span aria-hidden="true" />
      {english ? "Local connection ready" : "Connexion locale prête"} · {systemInfo.platform} · {systemInfo.architecture} · GX {systemInfo.appVersion}
    </p>
  ) : runtime === "desktop" ? (
    <p className="gx-runtime-status is-error" role="alert">
      {english ? "Local connection unavailable" : "Connexion locale indisponible"}
    </p>
  ) : null;

  return (
    <Workspace id="office" english={english} onStartPlan={onStartPlan} onRunTask={onRunTask} footer={status} legalBaseUrl={legalBaseUrl} />
  );
}
