import type {
  JordDriverPort,
  JordRecord,
  JordTrigger,
  JordTriggerEvent,
} from "@altr/jord";

import type { JordRole } from "../auth/roles.js";
import { runFunction } from "../functions/runner.js";
import type { LogRing } from "../jobs/log-ring.js";
import {
  actionFailHard,
  isBuiltinTriggerActionKind,
  parseActionsJson,
} from "./kinds.js";

export type TriggerFireInput = {
  jord: JordDriverPort;
  logs: LogRing;
  tableName: string;
  event: JordTriggerEvent;
  row: JordRecord | null;
  prior?: JordRecord | null;
  role: JordRole;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
  disabled?: boolean;
};

export type TriggerFireResult = {
  ran: number;
  errors: Array<{ triggerId: string; kind: string; message: string }>;
};

export function triggersDisabledFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const v = env.JORD_TRIGGERS_DISABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export async function runTriggersAfterWrite(
  input: TriggerFireInput,
): Promise<TriggerFireResult> {
  if (input.disabled) return { ran: 0, errors: [] };

  const triggers = await input.jord.listTriggersFor(
    input.tableName,
    input.event,
  );
  const errors: TriggerFireResult["errors"] = [];
  let ran = 0;

  for (const trigger of triggers) {
    const actions = parseActionsJson(trigger.actions);
    for (const action of actions) {
      if (!isBuiltinTriggerActionKind(action.kind)) {
        const message = `unknown action kind "${action.kind}"`;
        errors.push({
          triggerId: trigger.id,
          kind: action.kind,
          message,
        });
        input.logs.append({
          level: "warn",
          source: "trigger",
          message,
          meta: { triggerId: trigger.id, name: trigger.name },
        });
        if (actionFailHard(action.config)) {
          return { ran, errors };
        }
        continue;
      }

      try {
        await runAction(action.kind, action.config ?? {}, trigger, input);
        ran += 1;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "trigger action failed";
        errors.push({
          triggerId: trigger.id,
          kind: action.kind,
          message,
        });
        input.logs.append({
          level: "error",
          source: "trigger",
          message,
          meta: {
            triggerId: trigger.id,
            name: trigger.name,
            kind: action.kind,
          },
        });
        if (actionFailHard(action.config)) {
          return { ran, errors };
        }
      }
    }
  }

  return { ran, errors };
}

async function runAction(
  kind: string,
  config: Record<string, unknown>,
  trigger: JordTrigger,
  input: TriggerFireInput,
): Promise<void> {
  const payload = {
    event: input.event,
    table: input.tableName,
    row: input.row,
    prior: input.prior ?? null,
    triggerId: trigger.id,
    triggerName: trigger.name,
  };

  switch (kind) {
    case "echo":
      input.logs.append({
        level: "info",
        source: "trigger",
        message: `echo ${trigger.name}`,
        meta: { ...payload, echoed: true },
      });
      return;
    case "log":
      input.logs.append({
        level: "info",
        source: "trigger",
        message:
          typeof config.message === "string"
            ? config.message
            : `trigger ${trigger.name} on ${input.event}`,
        meta: payload,
      });
      return;
    case "invoke_function": {
      const functionId =
        typeof config.functionId === "string" ? config.functionId : null;
      if (!functionId) {
        throw new Error("invoke_function requires config.functionId");
      }
      const fn = await input.jord.getFunction(functionId);
      if (!fn) {
        throw new Error(`function ${functionId} not found`);
      }
      const result = await runFunction({
        jord: input.jord,
        fn,
        role: input.role,
        request: {
          method: "TRIGGER",
          path: `/triggers/${trigger.id}`,
          params: {},
          query: {},
          body: payload,
        },
        enqueueWrite: input.enqueueWrite,
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
      input.logs.append({
        level: "info",
        source: "trigger",
        message: `invoke_function ${fn.slug}`,
        meta: { triggerId: trigger.id, functionId, stepsRun: result.stepsRun },
      });
      return;
    }
    default:
      throw new Error(`unhandled kind ${kind}`);
  }
}
