"use client";

import { usePathname } from "next/navigation";

import {
  DEFAULT_PROJECT_SLUG,
  extractProjectSlug,
  projectHref,
} from "@/lib/project-scope";

export function useProjectSlug(): string {
  const pathname = usePathname() ?? "";
  return extractProjectSlug(pathname) ?? DEFAULT_PROJECT_SLUG;
}

export function useProjectHref(): (path?: string) => string {
  const slug = useProjectSlug();
  return (path = "") => projectHref(slug, path);
}
