"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  Menu,
  ListTree,
} from "lucide-react";
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  cn,
} from "@altr/apolyx";

import { INSPECTOR_TITLE_ID } from "@/components/inspector-chrome";
import {
  InspectorProvider,
  useInspectorOptional,
} from "@/components/inspector-host";
import { ProjectSwitcher } from "@/components/project-switcher";
import { SessionBadge } from "@/components/session-badge";
import { StudioBucketsSidebar } from "@/components/studio-buckets-sidebar";
import { StudioContextualSidebar } from "@/components/studio-contextual-sidebar";
import { StudioEndpointsSidebar } from "@/components/studio-endpoints-sidebar";
import { StudioJobsSidebar } from "@/components/studio-jobs-sidebar";
import {
  StudioContent,
  StudioInspector,
  StudioPanesProvider,
  useStudioPanes,
} from "@/components/studio-panes";
import { StudioSideNav } from "@/components/studio-side-nav";
import { StudioSqlSidebar } from "@/components/studio-sql-sidebar";
import { StudioTablesSidebar } from "@/components/studio-tables-sidebar";
import { SqlWorkspaceProvider } from "@/components/sql-workspace";
import {
  WorkspaceTabsProvider,
  WorkspaceTabsStrip,
} from "@/components/workspace-tabs";
import { useProjectSlug } from "@/hooks/use-project-path";
import type { JordRole } from "@/lib/auth/roles";
import {
  loadShellPrefs,
  saveShellPrefs,
  sidebarWidthCss,
} from "@/lib/studio-shell-prefs";
import { navForRole, resolveContextual } from "@/lib/studio-nav";

type Props = {
  children: React.ReactNode;
  role: JordRole;
  bypass: boolean;
};

const NAV_W = "14rem";
const NAV_W_COLLAPSED = "3.5rem";

export function StudioShell({ children, role, bypass }: Props) {
  const pathname = usePathname() ?? "";
  const projectSlug = useProjectSlug();
  const groups = useMemo(
    () => navForRole(role, projectSlug),
    [role, projectSlug],
  );
  const contextual = useMemo(
    () => resolveContextual(pathname, groups),
    [pathname, groups],
  );

  return (
    <StudioPanesProvider contextual={contextual} key={projectSlug}>
      <InspectorProvider role={role}>
        <WorkspaceTabsProvider enabled={contextual === "tables"}>
          <SqlWorkspaceProvider enabled={contextual === "queries"}>
            <ContextualSidebarMount contextual={contextual} role={role} />
            <StudioShellFrame
              role={role}
              bypass={bypass}
              contextual={contextual}
              projectSlug={projectSlug}
            >
              {children}
            </StudioShellFrame>
          </SqlWorkspaceProvider>
        </WorkspaceTabsProvider>
      </InspectorProvider>
    </StudioPanesProvider>
  );
}

/** Registers the section sidebar body into the shell slot (S0047 / S0050 / S0064). */
function ContextualSidebarMount({
  contextual,
  role,
}: {
  contextual: ReturnType<typeof resolveContextual>;
  role: JordRole;
}) {
  if (contextual === "tables") return <StudioTablesSidebar />;
  if (contextual === "jobs") return <StudioJobsSidebar />;
  if (contextual === "endpoints") return <StudioEndpointsSidebar />;
  if (contextual === "queries") return <StudioSqlSidebar />;
  if (contextual === "buckets") return <StudioBucketsSidebar role={role} />;
  return null;
}

function StudioShellFrame({
  children,
  role,
  bypass,
  contextual,
  projectSlug,
}: Props & {
  contextual: ReturnType<typeof resolveContextual>;
  projectSlug: string;
}) {
  const { inspectorOpen, setInspectorOpen, inspectorSlot } = useStudioPanes();
  const inspector = useInspectorOptional();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(null);
  const [prefsReady, setPrefsReady] = useState(false);

  useEffect(() => {
    const prefs = loadShellPrefs(projectSlug);
    setNavCollapsed(prefs.navCollapsed);
    setSidebarCollapsed(prefs.sidebarCollapsed);
    setSidebarWidth(prefs.sidebarWidth);
    setPrefsReady(true);
  }, [projectSlug]);

  useEffect(() => {
    if (!prefsReady) return;
    saveShellPrefs(projectSlug, {
      navCollapsed,
      sidebarCollapsed,
      sidebarWidth,
    });
  }, [projectSlug, navCollapsed, sidebarCollapsed, sidebarWidth, prefsReady]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [contextual]);

  useEffect(() => {
    if (!inspectorOpen) {
      setMobileInspectorOpen(false);
      return;
    }
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setMobileInspectorOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [inspectorOpen]);

  const dismissInspector = () => {
    if (inspector) inspector.close();
    else setInspectorOpen(false);
  };

  const showSidebar = contextual !== null;
  const desktopSidebarOpen = showSidebar && !sidebarCollapsed;

  const gridStyle = {
    ["--jord-nav-w" as string]: navCollapsed ? NAV_W_COLLAPSED : NAV_W,
    ["--jord-sidebar-w" as string]: desktopSidebarOpen
      ? sidebarWidthCss(sidebarWidth)
      : "0px",
  } as React.CSSProperties;

  return (
    <div
      className="flex min-h-[calc(100vh-var(--jord-banner-h,0px))] flex-col"
      style={gridStyle}
    >
      <a
        href="#jord-primary-nav"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to navigation
      </a>
      <a
        href="#jord-sidebar"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-12 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to sidebar
      </a>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-20 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-sm sm:gap-3 sm:px-4">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100%,18rem)] p-0">
            <SheetHeader className="border-b border-border px-4 py-3 text-left">
              <SheetTitle className="font-display">Jord Studio</SheetTitle>
            </SheetHeader>
            <StudioSideNav
              role={role}
              onNavigate={() => setMobileNavOpen(false)}
              className="max-h-[calc(100vh-4rem)]"
            />
          </SheetContent>
        </Sheet>

        {showSidebar ? (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="lg:hidden"
                aria-label="Open section sidebar"
              >
                <ListTree className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(100%,20rem)] p-0">
              <SheetHeader className="border-b border-border px-4 py-3 text-left">
                <SheetTitle className="font-display">Section</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100vh-4rem)] w-full">
                <StudioContextualSidebar
                  contextual={contextual}
                  width={sidebarWidth}
                  collapsed={false}
                  onWidthChange={setSidebarWidth}
                  onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
                />
              </div>
            </SheetContent>
          </Sheet>
        ) : null}

        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-foreground"
        >
          Jord Studio
        </Link>
        <ProjectSwitcher />
        <span className="hidden text-xs text-muted-foreground xl:inline">
          libSQL · table <code className="font-mono">records</code>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden lg:inline-flex"
            aria-pressed={navCollapsed}
            aria-label={
              navCollapsed ? "Expand primary navigation" : "Collapse primary navigation"
            }
            onClick={() => setNavCollapsed((v) => !v)}
          >
            {navCollapsed ? (
              <PanelLeft className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
          {showSidebar ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
              aria-pressed={sidebarCollapsed}
              aria-label={
                sidebarCollapsed
                  ? "Expand contextual sidebar"
                  : "Collapse contextual sidebar"
              }
              onClick={() => setSidebarCollapsed((v) => !v)}
            >
              <ListTree className="size-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="lg:hidden"
            aria-label="Open inspector"
            disabled={!inspectorSlot && !inspectorOpen}
            onClick={() => {
              setInspectorOpen(true);
              setMobileInspectorOpen(true);
            }}
          >
            <PanelRight className="size-4" />
          </Button>
          <SessionBadge role={role} bypass={bypass} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Primary nav — desktop */}
        <aside
          className={cn(
            "hidden shrink-0 border-r border-border bg-muted/20 transition-[width] duration-200 ease-out lg:block",
          )}
          style={{ width: "var(--jord-nav-w)" }}
          aria-label="Primary navigation"
        >
          <StudioSideNav
            role={role}
            collapsed={navCollapsed}
            className="max-h-[calc(100vh-3.5rem)]"
          />
        </aside>

        {/* Contextual sidebar — desktop; width reserved so grid does not collapse on load */}
        <aside
          className={cn(
            "hidden shrink-0 overflow-hidden border-r border-border bg-background transition-[width] duration-200 ease-out lg:block",
            !desktopSidebarOpen && "border-r-0",
          )}
          style={{ width: "var(--jord-sidebar-w)" }}
          aria-label="Contextual sidebar"
          aria-hidden={!desktopSidebarOpen}
        >
          {showSidebar && desktopSidebarOpen ? (
            <div className="h-[calc(100vh-3.5rem)] w-full">
              <StudioContextualSidebar
                contextual={contextual}
                width={sidebarWidth}
                collapsed={sidebarCollapsed}
                onWidthChange={setSidebarWidth}
                onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
              />
            </div>
          ) : null}
        </aside>

        {/* Content + inspector overlay region */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {contextual === "tables" ? <WorkspaceTabsStrip /> : null}
          <StudioContent>{children}</StudioContent>

          {/* Desktop inspector overlays content only — no layout shift */}
          <div className="absolute inset-0 hidden lg:block">
            <StudioInspector
              onDismiss={dismissInspector}
              labelledBy={INSPECTOR_TITLE_ID}
            >
              {inspectorSlot}
            </StudioInspector>
          </div>
        </div>
      </div>

      {/* Tablet / mobile: full-height sheet */}
      <Sheet
        open={mobileInspectorOpen && inspectorOpen}
        onOpenChange={(open) => {
          setMobileInspectorOpen(open);
          if (!open) dismissInspector();
        }}
      >
        <SheetContent
          side="right"
          showClose={false}
          className="flex h-full w-full flex-col p-0 sm:max-w-[30rem] lg:hidden"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {inspectorSlot}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
