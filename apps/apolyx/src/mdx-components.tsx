import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import { Kbd } from "@altr/apolyx";

import { Callout } from "@/components/docs/callout";
import { ComponentPreview } from "@/components/docs/component-preview";
import { InstallTabs } from "@/components/docs/install-tabs";
import { PropsTable } from "@/components/docs/props-table";
import { TokenTable } from "@/components/docs/token-table";
import { slugify, textOf } from "@/lib/slugify";

const components: MDXComponents = {
  h1: (props) => (
    <h1 className="font-display text-4xl font-semibold tracking-tight text-balance" {...props} />
  ),
  h2: ({ children, ...props }) => {
    const id = slugify(textOf(children));
    return (
      <h2
        id={id}
        className="group mt-12 scroll-mt-24 border-b border-border pb-2 font-display text-2xl font-semibold tracking-tight"
        {...props}
      >
        <a href={`#${id}`} className="no-underline">
          {children}
        </a>
      </h2>
    );
  },
  h3: (props) => (
    <h3 className="mt-8 scroll-mt-24 font-display text-lg font-semibold tracking-tight" {...props} />
  ),
  p: (props) => <p className="mt-4 leading-7 text-foreground/90" {...props} />,
  ul: (props) => <ul className="mt-4 list-disc space-y-2 pl-6 marker:text-muted-foreground" {...props} />,
  ol: (props) => <ol className="mt-4 list-decimal space-y-2 pl-6 marker:text-muted-foreground" {...props} />,
  li: (props) => <li className="leading-7" {...props} />,
  a: ({ href = "", ...props }) => {
    const className =
      "font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary";
    return href.startsWith("/") ? (
      <Link href={href} className={className} {...props} />
    ) : (
      <a href={href} className={className} target="_blank" rel="noreferrer" {...props} />
    );
  },
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  blockquote: (props) => (
    <blockquote className="mt-6 border-l-2 border-border pl-4 text-muted-foreground" {...props} />
  ),
  hr: () => <hr className="my-10 border-border" />,
  code: (props) => (
    <code
      className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] [pre_&]:bg-transparent [pre_&]:p-0"
      {...props}
    />
  ),
  pre: (props) => (
    <pre className="code-block mt-6 overflow-x-auto rounded-xl border border-border p-4 text-sm" {...props} />
  ),
  table: (props) => (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground" {...props} />
  ),
  td: (props) => <td className="border-t border-border px-4 py-2 align-top" {...props} />,
  Callout,
  ComponentPreview,
  InstallTabs,
  Kbd,
  PropsTable,
  TokenTable,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
