import { PermissionDecision, type Action } from "@gx/contracts";

export interface PermissionRule {
  action: string;
  decision: PermissionDecision;
  reason: string;
  scope?: {
    organizationId?: string;
    employeeId?: string;
    missionId?: string;
    resourceId?: string;
  };
  amount?: {
    operator: "lt" | "lte" | "eq" | "gte" | "gt";
    valueMinor: number;
    currency: string;
  };
}

export interface PermissionContext {
  organizationId?: string;
  employeeId?: string;
  missionId?: string;
  resourceId?: string;
  amountMinor?: number;
  currency?: string;
}

export interface PermissionEvaluation {
  decision: PermissionDecision;
  reason: string;
  matchedRule?: string;
  matchedRules: string[];
}

function matches(ruleAction: string, requestedAction: string): boolean {
  if (ruleAction === requestedAction) return true;
  if (!ruleAction.endsWith(".*")) return false;
  return requestedAction.startsWith(ruleAction.slice(0, -1));
}

function matchesScope(rule: PermissionRule, context: PermissionContext): boolean {
  if (!rule.scope) return true;
  if ((rule.scope.employeeId || rule.scope.missionId || rule.scope.resourceId)
    && !rule.scope.organizationId) return false;
  return (Object.keys(rule.scope) as Array<keyof NonNullable<PermissionRule["scope"]>>)
    .every((key) => rule.scope?.[key] === context[key]);
}

function matchesAmount(rule: PermissionRule, context: PermissionContext): boolean {
  if (!rule.amount) return true;
  const amount = rule.amount;
  const actual = context.amountMinor;
  if (typeof actual !== "number" || !Number.isSafeInteger(actual) || actual < 0 || context.currency !== amount.currency
    || !Number.isSafeInteger(amount.valueMinor) || amount.valueMinor < 0) return false;
  switch (amount.operator) {
    case "lt": return actual < amount.valueMinor;
    case "lte": return actual <= amount.valueMinor;
    case "eq": return actual === amount.valueMinor;
    case "gte": return actual >= amount.valueMinor;
    case "gt": return actual > amount.valueMinor;
  }
}

const rank: Record<PermissionDecision, number> = {
  [PermissionDecision.ALLOW]: 0,
  [PermissionDecision.ASK]: 1,
  [PermissionDecision.DENY]: 2,
};

export function evaluatePermission(
  rules: readonly PermissionRule[],
  action: string | Pick<Action, "kind">,
  context: PermissionContext = {},
): PermissionEvaluation {
  const requestedAction = typeof action === "string" ? action : action.kind;
  const matching = rules.filter((candidate) =>
    matches(candidate.action, requestedAction)
    && matchesScope(candidate, context)
    && matchesAmount(candidate, context));
  const rule = matching.reduce<PermissionRule | undefined>((mostRestrictive, candidate) =>
    !mostRestrictive || rank[candidate.decision] > rank[mostRestrictive.decision]
      ? candidate : mostRestrictive, undefined);

  if (rule) {
    return {
      decision: rule.decision,
      reason: rule.reason,
      matchedRule: rule.action,
      matchedRules: matching.map((candidate) => candidate.action),
    };
  }

  return {
    decision: PermissionDecision.DENY,
    reason: "Aucune autorisation explicite ne couvre cette action.",
    matchedRules: [],
  };
}

export { PermissionDecision };
