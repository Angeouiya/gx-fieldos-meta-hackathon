import { randomUUID } from "node:crypto";

import { PermissionDecision } from "@gx/contracts";
import { evaluatePermission, type PermissionContext, type PermissionRule } from "@gx/permissions";

export type TurnState =
  | "RECEIVED" | "VALIDATING" | "BUILDING_CONTEXT" | "UNDERSTANDING"
  | "PLANNING" | "CHECKING_POLICY" | "WAITING_APPROVAL" | "GENERATING"
  | "COMPLETED" | "FAILED" | "CANCELLED";

const allowedTransitions: Record<TurnState, readonly TurnState[]> = {
  RECEIVED: ["VALIDATING", "CANCELLED"],
  VALIDATING: ["BUILDING_CONTEXT", "FAILED", "CANCELLED"],
  BUILDING_CONTEXT: ["UNDERSTANDING", "FAILED", "CANCELLED"],
  UNDERSTANDING: ["PLANNING", "FAILED", "CANCELLED"],
  PLANNING: ["CHECKING_POLICY", "FAILED", "CANCELLED"],
  CHECKING_POLICY: ["WAITING_APPROVAL", "GENERATING", "COMPLETED", "FAILED", "CANCELLED"],
  WAITING_APPROVAL: ["CANCELLED"],
  GENERATING: ["COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export interface TurnIdentity {
  userId: string;
  organizationId?: string;
  employeeId?: string;
  projectId?: string;
  missionId?: string;
}

export interface TurnMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ContextSource {
  id: string;
  kind: "document" | "email" | "whatsapp" | "memory" | "project";
  text: string;
  ownerUserId: string;
  organizationId?: string;
  projectId?: string;
  employeeId?: string;
  sensitivity?: "ordinary" | "restricted";
}

export interface TurnEvent {
  turnId: string;
  correlationId: string;
  state: TurnState;
  at: string;
  durationMs?: number;
  errorCode?: "VALIDATION" | "MODEL_ERROR" | "EMPTY_OUTPUT" | "TIMEOUT";
}

export interface ModelRequest {
  instructions: string;
  messages: readonly TurnMessage[];
  sources: readonly Pick<ContextSource, "id" | "kind" | "text">[];
}

export interface ModelResult {
  outputText: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface ModelGateway {
  generate(request: ModelRequest, signal: AbortSignal): Promise<ModelResult>;
}

export interface TurnInput {
  identity: TurnIdentity;
  conversationId: string;
  messages: readonly TurnMessage[];
  sources?: readonly ContextSource[];
  requestedAction?: { kind: string; context?: PermissionContext };
  rules?: readonly PermissionRule[];
  signal?: AbortSignal;
  turnId?: string;
  correlationId?: string;
  instructions?: string;
}

export interface TurnResult {
  turnId: string;
  correlationId: string;
  state: TurnState;
  reply?: string;
  errorCode?: TurnEvent["errorCode"];
  events: readonly TurnEvent[];
  sourceIds: readonly string[];
}

export interface TurnDependencies {
  gateway: ModelGateway;
  onEvent?: (event: TurnEvent) => void | Promise<void>;
  now?: () => Date;
}

export function transitionTurn(state: TurnState, next: TurnState): TurnState {
  if (!allowedTransitions[state].includes(next)) {
    throw new Error(`Transition GX invalide : ${state} -> ${next}`);
  }
  return next;
}

export function selectAuthorizedSources(
  identity: TurnIdentity,
  sources: readonly ContextSource[],
  maxCharacters = 6_000,
): Array<Pick<ContextSource, "id" | "kind" | "text">> {
  const selected: Array<Pick<ContextSource, "id" | "kind" | "text">> = [];
  let remaining = maxCharacters;
  for (const source of sources) {
    if (remaining <= 0) break;
    if (source.ownerUserId !== identity.userId) continue;
    if (source.organizationId && source.organizationId !== identity.organizationId) continue;
    if (source.projectId && source.projectId !== identity.projectId) continue;
    if (source.employeeId && source.employeeId !== identity.employeeId) continue;
    if (source.sensitivity === "restricted") continue;
    const text = source.text.trim().slice(0, remaining);
    if (!text) continue;
    selected.push({ id: source.id, kind: source.kind, text });
    remaining -= text.length;
  }
  return selected;
}

function validInput(input: TurnInput): boolean {
  return Boolean(input.identity.userId.trim() && input.conversationId.trim()
    && input.messages.length > 0 && input.messages.length <= 20
    && input.messages[0]?.role === "user" && input.messages.at(-1)?.role === "user"
    && input.messages.every((message) => (message.role === "user" || message.role === "assistant")
      && message.content.trim() && message.content.length <= 4_000));
}

function isAbort(error: unknown, signal?: AbortSignal) {
  return signal?.aborted === true || (error instanceof Error && error.name === "AbortError");
}

export async function runTurn(input: TurnInput, dependencies: TurnDependencies): Promise<TurnResult> {
  const turnId = input.turnId ?? randomUUID();
  const correlationId = input.correlationId ?? randomUUID();
  const events: TurnEvent[] = [];
  const startedAt = (dependencies.now ?? (() => new Date()))().getTime();
  let state: TurnState = "RECEIVED";
  let sourceIds: string[] = [];

  const emit = async (next: TurnState, errorCode?: TurnEvent["errorCode"]) => {
    state = transitionTurn(state, next);
    const at = (dependencies.now ?? (() => new Date()))();
    const event: TurnEvent = {
      turnId, correlationId, state, at: at.toISOString(),
      ...(next === "COMPLETED" || next === "FAILED" || next === "CANCELLED"
        ? { durationMs: Math.max(0, at.getTime() - startedAt) } : {}),
      ...(errorCode ? { errorCode } : {}),
    };
    events.push(event);
    await dependencies.onEvent?.(event);
  };
  const result = (extra: Pick<TurnResult, "reply" | "errorCode"> = {}): TurnResult =>
    ({ turnId, correlationId, state, events, sourceIds, ...extra });

  if (input.signal?.aborted) {
    await emit("CANCELLED");
    return result();
  }
  await emit("VALIDATING");
  if (!validInput(input)) {
    await emit("FAILED", "VALIDATION");
    return result({ errorCode: "VALIDATION" });
  }
  if (input.signal?.aborted) { await emit("CANCELLED"); return result(); }

  await emit("BUILDING_CONTEXT");
  const sources = selectAuthorizedSources(input.identity, input.sources ?? []);
  sourceIds = sources.map((source) => source.id);
  await emit("UNDERSTANDING");
  await emit("PLANNING");
  await emit("CHECKING_POLICY");

  if (input.requestedAction) {
    const policy = evaluatePermission(input.rules ?? [], input.requestedAction.kind, {
      organizationId: input.identity.organizationId,
      employeeId: input.identity.employeeId,
      missionId: input.identity.missionId,
      ...input.requestedAction.context,
    });
    if (policy.decision === PermissionDecision.DENY) {
      await emit("COMPLETED");
      return result({ reply: "Cette action est bloquée par les autorisations GX." });
    }
    if (policy.decision === PermissionDecision.ASK) {
      await emit("WAITING_APPROVAL");
      return result({ reply: "Cette action attend votre validation avant exécution." });
    }
  }
  if (input.signal?.aborted) { await emit("CANCELLED"); return result(); }

  await emit("GENERATING");
  try {
    const response = await dependencies.gateway.generate({
      instructions: input.instructions ?? "Tu es GX.ai. Réponds avec clarté et précision dans la langue de l’utilisateur. N’affirme aucune action externe sans résultat vérifié.",
      messages: input.messages.map((message) => ({ role: message.role, content: message.content.trim() })),
      sources,
    }, input.signal ?? new AbortController().signal);
    if (input.signal?.aborted) { await emit("CANCELLED"); return result(); }
    const reply = response.outputText.trim();
    if (!reply) {
      await emit("FAILED", "EMPTY_OUTPUT");
      return result({ errorCode: "EMPTY_OUTPUT" });
    }
    await emit("COMPLETED");
    return result({ reply });
  } catch (error) {
    if (isAbort(error, input.signal)) {
      await emit("CANCELLED");
      return result();
    }
    await emit("FAILED", "MODEL_ERROR");
    return result({ errorCode: "MODEL_ERROR" });
  }
}

export class FakeModelGateway implements ModelGateway {
  readonly requests: ModelRequest[] = [];
  private readonly response: string | Error;
  private readonly delayMs: number;

  constructor(response: string | Error, delayMs = 0) {
    this.response = response;
    this.delayMs = delayMs;
  }

  async generate(request: ModelRequest, signal: AbortSignal): Promise<ModelResult> {
    this.requests.push(request);
    if (signal.aborted) throw new DOMException("Annulé", "AbortError");
    if (this.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.delayMs);
        signal.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Annulé", "AbortError")); }, { once: true });
      });
    }
    if (this.response instanceof Error) throw this.response;
    return { outputText: this.response };
  }
}
