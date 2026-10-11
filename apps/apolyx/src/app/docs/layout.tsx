import { SidebarNav } from "@/components/site/sidebar-nav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-screen-2xl gap-10 px-4 sm:px-6">
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto py-8 lg:block">
        <SidebarNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
