import { SidebarNav } from "@/components/site/sidebar-nav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full gap-4 px-2 sm:gap-6 sm:px-3 lg:px-4">
      {/* Sticky shell stays put; only the inner rail scrolls — avoids 1px page-scroll jitter. */}
      <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-[17.125rem] shrink-0 self-start lg:block">
        <div className="apolyx-rail h-full overflow-y-auto overscroll-contain py-8 [overflow-anchor:none]">
          <SidebarNav />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
