"use client";

import {
  alertPlayground,
  badgePlayground,
  buttonPlayground,
  switchPlayground,
} from "./pilots";
import type { PlaygroundSchema } from "./types";

const playgrounds: PlaygroundSchema[] = [
  buttonPlayground,
  badgePlayground,
  alertPlayground,
  switchPlayground,
];

export const playgroundByDemo = Object.fromEntries(
  playgrounds.map((schema) => [schema.id, schema]),
) as Record<string, PlaygroundSchema>;

export function getPlayground(demoName: string): PlaygroundSchema | undefined {
  return playgroundByDemo[demoName];
}
