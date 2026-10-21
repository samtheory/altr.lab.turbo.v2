/** In-process enable/disable for generated CRUD resources (Studio S4). */

export const GENERATED_API_RESOURCES = ["records"] as const;

export type GeneratedApiResourceId = (typeof GENERATED_API_RESOURCES)[number];

export function isGeneratedApiResourceId(
  value: string,
): value is GeneratedApiResourceId {
  return (GENERATED_API_RESOURCES as readonly string[]).includes(value);
}

export function parseDisabledResourceIds(
  raw: string | undefined,
): GeneratedApiResourceId[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(isGeneratedApiResourceId);
}

export class GeneratedApiRegistry {
  private readonly enabled = new Map<GeneratedApiResourceId, boolean>();

  constructor(disabledAtBoot: readonly GeneratedApiResourceId[] = []) {
    for (const id of GENERATED_API_RESOURCES) {
      this.enabled.set(id, !disabledAtBoot.includes(id));
    }
  }

  isEnabled(id: string): boolean {
    if (!isGeneratedApiResourceId(id)) return false;
    return this.enabled.get(id) === true;
  }

  setEnabled(id: string, enabled: boolean): boolean {
    if (!isGeneratedApiResourceId(id)) return false;
    this.enabled.set(id, enabled);
    return true;
  }

  listEnabled(): Record<GeneratedApiResourceId, boolean> {
    return {
      records: this.isEnabled("records"),
    };
  }
}

export function createGeneratedApiRegistry(
  env: NodeJS.ProcessEnv = process.env,
): GeneratedApiRegistry {
  return new GeneratedApiRegistry(
    parseDisabledResourceIds(env.JORD_GENERATED_API_DISABLED),
  );
}
