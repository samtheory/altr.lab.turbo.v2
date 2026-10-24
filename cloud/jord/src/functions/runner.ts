import type { JordDriverPort, JordFunction } from "@altr/jord";

import type { JordRole } from "../auth/roles.js";
import type { LogRing } from "../jobs/log-ring.js";
import {
  FunctionStepError,
  getStepHandler,
  parseStepsJson,
  type FunctionRequestContext,
} from "./kinds.js";

export type RunFunctionInput = {
  jord: JordDriverPort;
  fn: JordFunction;
  role: JordRole;
  request: FunctionRequestContext;
  enqueueWrite: <T>(work: () => Promise<T>) => Promise<T>;
  logs?: LogRing;
};

export type RunFunctionOk = {
  ok: true;
  result: unknown;
  stepsRun: number;
};

export type RunFunctionErr = {
  ok: false;
  status: number;
  error: string;
  message: string;
  stepIndex?: number;
  kind?: string;
};

export type RunFunctionResult = RunFunctionOk | RunFunctionErr;

export async function runFunction(
  input: RunFunctionInput,
): Promise<RunFunctionResult> {
  if (!input.fn.enabled) {
    return {
      ok: false,
      status: 503,
      error: "function_disabled",
      message: `Function "${input.fn.slug}" is disabled`,
    };
  }

  const steps = parseStepsJson(input.fn.steps);
  if (steps.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "empty_steps",
      message: "function has no steps",
    };
  }

  let prior: unknown = null;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const handler = getStepHandler(step.kind);
    if (!handler) {
      return {
        ok: false,
        status: 400,
        error: "unknown_step_kind",
        message: `unknown step kind "${step.kind}"`,
        stepIndex: i,
        kind: step.kind,
      };
    }
    try {
      const out = await handler({
        jord: input.jord,
        role: input.role,
        request: input.request,
        prior,
        config: step.config ?? {},
        enqueueWrite: input.enqueueWrite,
        logs: input.logs,
      });
      prior = out.result;
    } catch (err) {
      if (err instanceof FunctionStepError) {
        return {
          ok: false,
          status: err.status,
          error: err.code,
          message: err.message,
          stepIndex: i,
          kind: step.kind,
        };
      }
      const message = err instanceof Error ? err.message : "step failed";
      return {
        ok: false,
        status: 500,
        error: "step_failed",
        message,
        stepIndex: i,
        kind: step.kind,
      };
    }
  }

  return { ok: true, result: prior, stepsRun: steps.length };
}
