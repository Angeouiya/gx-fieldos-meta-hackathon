import { PermissionDecision } from "@gx/contracts";

import type { PermissionRule } from "./index.ts";

export const foundationPolicy: readonly PermissionRule[] = [
  {
    action: "system.info.read",
    decision: PermissionDecision.ALLOW,
    reason: "La lecture des informations système non sensibles est autorisée.",
  },
  {
    action: "external.message.send",
    decision: PermissionDecision.ASK,
    reason: "Toute communication externe exige une confirmation.",
  },
  {
    action: "credentials.export",
    decision: PermissionDecision.DENY,
    reason: "Les identifiants ne peuvent jamais être exportés.",
  },
];
