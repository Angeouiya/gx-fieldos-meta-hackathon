export type EntityId = string;
export type ISODateTime = string;

export { calculateWorkMetric } from "./work-metrics.ts";
export type { WorkMetricEvaluation, WorkMetricInput, WorkMetricResult } from "./work-metrics.ts";

export const PermissionDecision = {
  ALLOW: "ALLOW",
  ASK: "ASK",
  DENY: "DENY",
} as const;

export type PermissionDecision =
  (typeof PermissionDecision)[keyof typeof PermissionDecision];

export interface Action {
  id: EntityId;
  kind: string;
  label: string;
  requestedAt: ISODateTime;
}

export interface ActionResult {
  actionId: EntityId;
  success: boolean;
  summary: string;
  completedAt: ISODateTime;
}

export interface Device {
  id: EntityId;
  label: string;
  platform: string;
  architecture: string;
  appVersion: string;
  status: "online" | "offline";
}
