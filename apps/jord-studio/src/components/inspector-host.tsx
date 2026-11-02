"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CreateRecordForm } from "@/components/create-record-form";
import { CreateTableForm } from "@/components/create-table-form";
import {
  InspectorPanelChrome,
  INSPECTOR_TITLE_ID,
} from "@/components/inspector-chrome";
import { InsertTableRowForm } from "@/components/insert-table-row-form";
import { MigrateWizardPanel } from "@/components/migrate-wizard-panel";
import { RecordDetailInspector } from "@/components/record-detail-inspector";
import { useStudioPanes } from "@/components/studio-panes";
import type { JordRole } from "@/lib/auth/roles";
import {
  inspectorHref,
  inspectorTitle,
  parseInspectorSearch,
  type InspectorId,
  type InspectorProps,
  type InspectorState,
} from "@/lib/studio-inspector";
import { useProjectHref } from "@/hooks/use-project-path";

export { INSPECTOR_TITLE_ID };

type InspectorApi = {
  open: (id: InspectorId, props?: InspectorProps) => void;
  close: () => void;
  state: InspectorState | null;
  isOpen: boolean;
};

const InspectorContext = createContext<InspectorApi | null>(null);

export function useInspector(): InspectorApi {
  const ctx = useContext(InspectorContext);
  if (!ctx) {
    throw new Error("useInspector must be used within InspectorProvider");
  }
  return ctx;
}

/** Safe outside the shell (login). */
export function useInspectorOptional(): InspectorApi | null {
  return useContext(InspectorContext);
}

type ProviderProps = {
  role: JordRole;
  children: ReactNode;
};

/**
 * Syncs `?inspector=` ↔ StudioInspector slot. `open` pushes history so
 * browser Back closes; ESC / click-away replace when there was no push.
 */
export function InspectorProvider({ role, children }: ProviderProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const { setInspectorOpen, setInspectorSlot } = useStudioPanes();
  const pushedRef = useRef(false);

  const state = useMemo(
    () => parseInspectorSearch(searchParams),
    [searchParams],
  );

  const close = useCallback(() => {
    if (pushedRef.current) {
      pushedRef.current = false;
      router.back();
      return;
    }
    const href = inspectorHref(pathname, searchParams, null);
    router.replace(href);
  }, [pathname, router, searchParams]);

  const open = useCallback(
    (id: InspectorId, props: InspectorProps = {}) => {
      const next: InspectorState = { id, props };
      const current = parseInspectorSearch(searchParams);
      if (
        current &&
        current.id === next.id &&
        current.props.recordId === next.props.recordId &&
        current.props.table === next.props.table &&
        current.props.seedPk === next.props.seedPk &&
        current.props.schema === next.props.schema
      ) {
        return;
      }
      const href = inspectorHref(pathname, searchParams, next);
      if (current) {
        // Swap panels without stacking history entries.
        router.replace(href);
        return;
      }
      pushedRef.current = true;
      router.push(href);
    },
    [pathname, router, searchParams],
  );

  const api = useMemo<InspectorApi>(
    () => ({
      open,
      close,
      state,
      isOpen: state != null,
    }),
    [open, close, state],
  );

  useEffect(() => {
    setInspectorOpen(state != null);
    if (!state) {
      setInspectorSlot(null);
      return;
    }

    const title = inspectorTitle(state.id);
    setInspectorSlot(
      <InspectorPanelChrome title={title} onClose={close}>
        <InspectorPanelBody
          id={state.id}
          props={state.props}
          role={role}
          onClose={close}
          onOpen={open}
        />
      </InspectorPanelChrome>,
    );

    return () => {
      setInspectorSlot(null);
    };
  }, [state, role, close, open, setInspectorOpen, setInspectorSlot]);

  return (
    <InspectorContext.Provider value={api}>{children}</InspectorContext.Provider>
  );
}

function InspectorPanelBody({
  id,
  props,
  role,
  onClose,
  onOpen,
}: {
  id: InspectorId;
  props: InspectorProps;
  role: JordRole;
  onClose: () => void;
  onOpen: (id: InspectorId, props?: InspectorProps) => void;
}) {
  switch (id) {
    case "create-record":
      return (
        <CreateRecordForm
          role={role}
          layout="inspector"
          onCancel={onClose}
          onCreated={(recordId) =>
            onOpen("record-detail", { recordId })
          }
        />
      );
    case "create-table":
      return (
        <CreateTableInspectorBody
          role={role}
          schema={props.schema ?? "public"}
          onClose={onClose}
        />
      );
    case "record-detail":
      return (
        <RecordDetailInspector
          recordId={props.recordId ?? ""}
          role={role}
          onClose={onClose}
        />
      );
    case "migrate":
      return (
        <MigrateWizardPanel
          role={role}
          layout="inspector"
          onClose={onClose}
        />
      );
    case "insert-table-row":
      return (
        <InsertTableRowForm
          role={role}
          table={props.table ?? ""}
          schema={props.schema ?? "public"}
          seedPk={props.seedPk}
          onCancel={onClose}
          onCreated={onClose}
        />
      );
  }
}

function CreateTableInspectorBody({
  role,
  schema,
  onClose,
}: {
  role: JordRole;
  schema: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const hrefFor = useProjectHref();
  return (
    <CreateTableForm
      role={role}
      schema={schema}
      onCancel={onClose}
      onCreated={(table, tableSchema) => {
        const qs =
          tableSchema && tableSchema !== "public" && tableSchema !== "main"
            ? `?schema=${encodeURIComponent(tableSchema)}`
            : "";
        onClose();
        router.push(
          `${hrefFor(`/tables/${encodeURIComponent(table)}`)}${qs}`,
        );
      }}
    />
  );
}
