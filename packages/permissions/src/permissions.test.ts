import assert from "node:assert/strict";
import test from "node:test";

import { foundationPolicy } from "./mock-policies.ts";
import { evaluatePermission, PermissionDecision } from "./index.ts";

test("GX-PERM-001: ALLOW works for a known safe action", () => {
  const result = evaluatePermission(foundationPolicy, "system.info.read");
  assert.equal(result.decision, PermissionDecision.ALLOW);
});

test("GX-PERM-002: ASK works for an external action", () => {
  const result = evaluatePermission(foundationPolicy, "external.message.send");
  assert.equal(result.decision, PermissionDecision.ASK);
});

test("GX-PERM-003: DENY works for a forbidden or unknown action", () => {
  assert.equal(
    evaluatePermission(foundationPolicy, "credentials.export").decision,
    PermissionDecision.DENY,
  );
  assert.equal(
    evaluatePermission(foundationPolicy, "computer.control").decision,
    PermissionDecision.DENY,
  );
});

test("GX-GOV-001: the most restrictive applicable rule wins regardless of order", () => {
  const rules = [
    { action: "external.*", decision: PermissionDecision.ALLOW, reason: "Général" },
    { action: "external.message.send", decision: PermissionDecision.ASK, reason: "Validation" },
    { action: "external.message.send", decision: PermissionDecision.DENY, reason: "Blocage" },
  ];
  const result = evaluatePermission(rules, "external.message.send");
  assert.equal(result.decision, PermissionDecision.DENY);
  assert.equal(result.reason, "Blocage");
  assert.equal(result.matchedRules.length, 3);
  assert.equal(evaluatePermission([...rules].reverse(), "external.message.send").decision, PermissionDecision.DENY);
});

test("GX-GOV-002: organization and employee rules do not leak between scopes", () => {
  const rules = [
    { action: "document.read", decision: PermissionDecision.ALLOW, reason: "Organisation A", scope: { organizationId: "org-a" } },
    { action: "document.read", decision: PermissionDecision.DENY, reason: "Employé limité", scope: { organizationId: "org-a", employeeId: "emp-1" } },
  ];
  assert.equal(evaluatePermission(rules, "document.read", { organizationId: "org-a" }).decision, PermissionDecision.ALLOW);
  assert.equal(evaluatePermission(rules, "document.read", { organizationId: "org-a", employeeId: "emp-1" }).decision, PermissionDecision.DENY);
  assert.equal(evaluatePermission(rules, "document.read", { organizationId: "org-b", employeeId: "emp-1" }).decision, PermissionDecision.DENY);
  assert.deepEqual(evaluatePermission(rules, "document.read", { organizationId: "org-b" }).matchedRules, []);
  assert.equal(evaluatePermission([{ action: "document.read", decision: PermissionDecision.ALLOW, reason: "Portée invalide", scope: { employeeId: "emp-1" } }], "document.read", { organizationId: "org-a", employeeId: "emp-1" }).decision, PermissionDecision.DENY);
});

test("GX-GOV-003: amount thresholds use integer minor units and currency", () => {
  const rules = [
    { action: "purchase.approve", decision: PermissionDecision.ALLOW, reason: "Petit achat", amount: { operator: "lte" as const, valueMinor: 50_000, currency: "XOF" } },
    { action: "purchase.approve", decision: PermissionDecision.ASK, reason: "Validation humaine", amount: { operator: "gt" as const, valueMinor: 50_000, currency: "XOF" } },
  ];
  assert.equal(evaluatePermission(rules, "purchase.approve", { amountMinor: 50_000, currency: "XOF" }).decision, PermissionDecision.ALLOW);
  assert.equal(evaluatePermission(rules, "purchase.approve", { amountMinor: 50_001, currency: "XOF" }).decision, PermissionDecision.ASK);
  assert.equal(evaluatePermission(rules, "purchase.approve", { amountMinor: 50_001, currency: "EUR" }).decision, PermissionDecision.DENY);
  assert.equal(evaluatePermission(rules, "purchase.approve", { currency: "XOF" }).decision, PermissionDecision.DENY);
});
