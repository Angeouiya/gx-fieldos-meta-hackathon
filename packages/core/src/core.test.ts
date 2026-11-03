import assert from "node:assert/strict";
import test from "node:test";

import { PermissionDecision } from "@gx/contracts";

import { FakeModelGateway, runTurn, selectAuthorizedSources, transitionTurn, type TurnInput } from "./index.ts";

const input: TurnInput = {
  identity: { userId: "owner-1", organizationId: "org-a", projectId: "project-a" },
  conversationId: "conversation-1",
  messages: [{ role: "user", content: "Prépare le plan de récolte." }],
};

test("GX-CORE-002: invalid state transitions are rejected", () => {
  assert.equal(transitionTurn("RECEIVED", "VALIDATING"), "VALIDATING");
  assert.throws(() => transitionTurn("RECEIVED", "COMPLETED"), /invalide/);
  assert.throws(() => transitionTurn("COMPLETED", "GENERATING"), /invalide/);
});

test("GX-CORE-005: context selection is scoped before model access", () => {
  const selected = selectAuthorizedSources(input.identity, [
    { id: "allowed", kind: "project", text: "Récolte maïs", ownerUserId: "owner-1", organizationId: "org-a", projectId: "project-a" },
    { id: "other-owner", kind: "project", text: "Privé", ownerUserId: "owner-2", organizationId: "org-a" },
    { id: "other-org", kind: "project", text: "Privé", ownerUserId: "owner-1", organizationId: "org-b" },
    { id: "other-project", kind: "project", text: "Privé", ownerUserId: "owner-1", organizationId: "org-a", projectId: "project-b" },
    { id: "restricted", kind: "document", text: "Privé", ownerUserId: "owner-1", organizationId: "org-a", sensitivity: "restricted" },
  ]);
  assert.deepEqual(selected, [{ id: "allowed", kind: "project", text: "Récolte maïs" }]);
});

test("GX-CORE-001: coordinator emits bounded state events and a model reply", async () => {
  const gateway = new FakeModelGateway("Plan de récolte prêt.");
  const events: string[] = [];
  const result = await runTurn({
    ...input,
    sources: [{ id: "field-notes", kind: "document", text: "État parcelle", ownerUserId: "owner-1", organizationId: "org-a" }],
  }, { gateway, onEvent: (event) => { events.push(event.state); } });
  assert.equal(result.state, "COMPLETED");
  assert.equal(result.reply, "Plan de récolte prêt.");
  assert.equal(result.sourceIds[0], "field-notes");
  assert.deepEqual(events, ["VALIDATING", "BUILDING_CONTEXT", "UNDERSTANDING", "PLANNING", "CHECKING_POLICY", "GENERATING", "COMPLETED"]);
  assert.equal(gateway.requests.length, 1);
  assert.equal(gateway.requests[0]?.sources[0]?.text, "État parcelle");
  assert.ok(result.events.every((event) => !JSON.stringify(event).includes("État parcelle")));
});

test("GX-CORE-014: cancellation stops the provider and records CANCELLED", async () => {
  const controller = new AbortController();
  const gateway = new FakeModelGateway("Résultat tardif", 100);
  const pending = runTurn({ ...input, signal: controller.signal }, { gateway });
  setTimeout(() => controller.abort(), 10);
  const result = await pending;
  assert.equal(result.state, "CANCELLED");
  assert.equal(result.reply, undefined);
  assert.equal(result.events.at(-1)?.state, "CANCELLED");
});

test("GX-CORE-012: provider errors and empty output stay typed", async () => {
  const failed = await runTurn(input, { gateway: new FakeModelGateway(new Error("secret provider detail")) });
  assert.equal(failed.state, "FAILED");
  assert.equal(failed.errorCode, "MODEL_ERROR");
  assert.doesNotMatch(JSON.stringify(failed), /secret provider detail/);
  const empty = await runTurn(input, { gateway: new FakeModelGateway("  ") });
  assert.equal(empty.errorCode, "EMPTY_OUTPUT");
});

test("GX-GOV-004: approval and denial stop before the model", async () => {
  const gateway = new FakeModelGateway("Should not run");
  const rules = [{ action: "external.message.send", decision: PermissionDecision.ASK, reason: "Vérification humaine" }];
  const waiting = await runTurn({ ...input, requestedAction: { kind: "external.message.send" }, rules }, { gateway });
  assert.equal(waiting.state, "WAITING_APPROVAL");
  assert.equal(gateway.requests.length, 0);
  const denied = await runTurn({ ...input, requestedAction: { kind: "credentials.export" }, rules }, { gateway });
  assert.equal(denied.state, "COMPLETED");
  assert.match(denied.reply ?? "", /bloquée/);
  assert.equal(gateway.requests.length, 0);
});
