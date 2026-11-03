import assert from "node:assert/strict";
import test from "node:test";

import {
  PermissionDecision,
  type Action,
  type ActionResult,
  type Device,
} from "./index.ts";

test("GX-CONTRACT-001: PermissionDecision exposes ALLOW, ASK and DENY", () => {
  assert.deepEqual(Object.values(PermissionDecision), ["ALLOW", "ASK", "DENY"]);
});

test("GX-CONTRACT-002: the foundation contracts describe one safe action chain", () => {
  const action: Action = {
    id: "action-system-info",
    kind: "system.info.read",
    label: "Lire les informations système non sensibles",
    requestedAt: "2026-09-27T00:00:00.000Z",
  };
  const result: ActionResult = {
    actionId: action.id,
    success: true,
    summary: "Informations système reçues.",
    completedAt: "2026-09-27T00:00:01.000Z",
  };
  const device: Device = {
    id: "device-local",
    label: "Cet appareil",
    platform: "windows",
    architecture: "x86_64",
    appVersion: "0.1.0",
    status: "online",
  };

  assert.equal(result.actionId, action.id);
  assert.equal(device.status, "online");
});
