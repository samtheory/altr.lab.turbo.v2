"use client";

import {
  alertPlayground,
  badgePlayground,
  buttonPlayground,
  cardPlayground,
  checkboxPlayground,
  inputPlayground,
  progressPlayground,
  separatorPlayground,
  skeletonPlayground,
  spinnerPlayground,
  switchPlayground,
} from "./pilots";
import type { PlaygroundSchema } from "./types";

const playgrounds: PlaygroundSchema[] = [
  buttonPlayground,
  badgePlayground,
  alertPlayground,
  switchPlayground,
  cardPlayground,
  inputPlayground,
  progressPlayground,
  separatorPlayground,
  spinnerPlayground,
  skeletonPlayground,
  checkboxPlayground,
];

export const playgroundByDemo = Object.fromEntries(
  playgrounds.map((schema) => [schema.id, schema]),
) as Record<string, PlaygroundSchema>;

export function getPlayground(demoName: string): PlaygroundSchema | undefined {
  return playgroundByDemo[demoName];
}
