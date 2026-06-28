"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, Eye, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type SortValue = string | number | boolean | null | undefined;

export type TableColumn<T> = {
  header: string;
  cell: (item: T) => React.ReactNode;
  sortValue?: (item: T) => SortValue;
};

type EntityTableProps<T extends { id: string }> = {
  items: T[];
  columns: TableColumn<T>[];
  emptyMessage: string;
  emptyDetail?: string;
  getViewHref?: (item: T) => string;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  getCanDelete?: (item: T) => boolean;
};

export function EntityTable<T extends { id: string }>({
  items,
  columns,
  emptyMessage,
  emptyDetail,
  getViewHref,
  onEdit,
  onDelete,
  getCanDelete,
}: EntityTableProps<T>) {
  const sortableColumns = columns.filter((column) => column.sortValue);
  const [sort, setSort] = useState<{ header: string; direction: "asc" | "desc" } | null>(
    sortableColumns[0] ? { header: sortableColumns[0].header, direction: "asc" } : null,
  );

  const sortedItems = useMemo(() => {
    if (!sort) return items;
    const column = columns.find((item) => item.header === sort.header);
    if (!column?.sortValue) return items;

    return [...items].sort((first, second) => {
      const firstValue = column.sortValue?.(first);
      const secondValue = column.sortValue?.(second);
      const firstEmpty = firstValue === null || firstValue === undefined || firstValue === "";
      const secondEmpty = secondValue === null || secondValue === undefined || secondValue === "";

      if (firstEmpty && secondEmpty) return 0;
      if (firstEmpty) return 1;
      if (secondEmpty) return -1;

      const result =
        typeof firstValue === "number" && typeof secondValue === "number"
          ? firstValue - secondValue
          : String(firstValue).localeCompare(String(secondValue), undefined, {
              numeric: true,
              sensitivity: "base",
            });

      return sort.direction === "asc" ? result : -result;
    });
  }, [columns, items, sort]);

  function toggleSort(column: TableColumn<T>) {
    if (!column.sortValue) return;
    setSort((current) =>
      current?.header === column.header
        ? { header: column.header, direction: current.direction === "asc" ? "desc" : "asc" }
        : { header: column.header, direction: "asc" },
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-700">{emptyMessage}</p>
        {emptyDetail ? (
          <p className="mt-2 text-sm text-slate-500">{emptyDetail}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.header} className="px-4 py-3">
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-950"
                    >
                      {column.header}
                      {sort?.header === column.header ? (
                        sort.direction === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedItems.map((item) => {
              const canDelete = getCanDelete ? getCanDelete(item) : true;
              return (
                <tr key={item.id} className="align-top">
                  {columns.map((column) => (
                    <td key={column.header} className="px-4 py-3 text-slate-700">
                      {column.cell(item)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {getViewHref ? (
                        <Link
                          href={getViewHref(item)}
                          className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                          aria-label="View details"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          className="rounded-md border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
