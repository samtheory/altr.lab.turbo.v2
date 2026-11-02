"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";

import { cn } from "../../lib/utils";
import { Badge } from "./badge";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import {
  defaultOperatorsForType,
  FILTER_OPERATOR_LABELS,
  type DataGridColumnDef,
  type DataGridColumnType,
  type DataGridFilter,
  type DataGridFilterOperator,
} from "./data-grid-types";

function newFilterId(): string {
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}

function needsValue(op: DataGridFilterOperator): boolean {
  return (
    op !== "is_null" &&
    op !== "is_not_null" &&
    op !== "is_true" &&
    op !== "is_false"
  );
}

function needsRange(op: DataGridFilterOperator): boolean {
  return op === "between";
}

export type DataGridFilterBuilderProps<T> = {
  columns: DataGridColumnDef<T>[];
  filters: DataGridFilter[];
  onFiltersChange: (filters: DataGridFilter[]) => void;
  quickSearch?: string;
  onQuickSearchChange?: (value: string) => void;
  className?: string;
};

export function DataGridFilterBuilder<T>({
  columns,
  filters,
  onFiltersChange,
  quickSearch,
  onQuickSearchChange,
  className,
}: DataGridFilterBuilderProps<T>) {
  const filterable = columns.filter((c) => c.filterable !== false);

  function addFilter(columnId: string) {
    const column = filterable.find((c) => c.id === columnId);
    const operators = defaultOperatorsForType(column?.type);
    const operator = operators[0] ?? "contains";
    onFiltersChange([
      ...filters,
      { id: newFilterId(), columnId, operator, value: "" },
    ]);
  }

  function updateFilter(id: string, patch: Partial<DataGridFilter>) {
    onFiltersChange(
      filters.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    );
  }

  function removeFilter(id: string) {
    onFiltersChange(filters.filter((f) => f.id !== id));
  }

  return (
    <div
      data-slot="data-grid-filter-builder"
      className={cn("flex flex-col gap-2", className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        {onQuickSearchChange ? (
          <Input
            type="search"
            value={quickSearch ?? ""}
            onChange={(e) => onQuickSearchChange(e.target.value)}
            placeholder="Quick search…"
            aria-label="Quick search"
            className="max-w-xs"
            size="sm"
          />
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Plus className="size-3.5" aria-hidden />
              Add filter
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-auto">
            {filterable.map((col) => (
              <DropdownMenuItem
                key={col.id}
                onSelect={() => addFilter(col.id)}
              >
                {typeof col.header === "string" ? col.header : col.id}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {filters.length > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange([])}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {filters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Active filters">
          {filters.map((filter) => {
            const column = filterable.find((c) => c.id === filter.columnId);
            const type: DataGridColumnType = column?.type ?? "unknown";
            const operators = defaultOperatorsForType(type);
            const label =
              typeof column?.header === "string" ? column.header : filter.columnId;

            return (
              <div
                key={filter.id}
                role="listitem"
                className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1"
              >
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {label}
                </Badge>
                <Select
                  size="sm"
                  value={filter.operator}
                  onValueChange={(value) =>
                    updateFilter(filter.id, {
                      operator: value as DataGridFilterOperator,
                    })
                  }
                >
                  <SelectTrigger className="h-7 w-[7.5rem]" aria-label={`${label} operator`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op} value={op}>
                        {FILTER_OPERATOR_LABELS[op]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {needsValue(filter.operator) ? (
                  <Input
                    size="sm"
                    className="h-7 w-28"
                    value={filter.value == null ? "" : String(filter.value)}
                    onChange={(e) =>
                      updateFilter(filter.id, { value: e.target.value })
                    }
                    aria-label={`${label} value`}
                  />
                ) : null}
                {needsRange(filter.operator) ? (
                  <Input
                    size="sm"
                    className="h-7 w-28"
                    value={filter.valueTo == null ? "" : String(filter.valueTo)}
                    onChange={(e) =>
                      updateFilter(filter.id, { valueTo: e.target.value })
                    }
                    aria-label={`${label} upper value`}
                    placeholder="to"
                  />
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${label} filter`}
                  onClick={() => removeFilter(filter.id)}
                >
                  <X className="size-3.5" aria-hidden />
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
