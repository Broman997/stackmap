import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";

export type TableColumn<T> = {
  header: string;
  cell: (item: T) => React.ReactNode;
};

type EntityTableProps<T extends { id: string }> = {
  items: T[];
  columns: TableColumn<T>[];
  emptyMessage: string;
  emptyDetail?: string;
  getViewHref?: (item: T) => string;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
};

export function EntityTable<T extends { id: string }>({
  items,
  columns,
  emptyMessage,
  emptyDetail,
  getViewHref,
  onEdit,
  onDelete,
}: EntityTableProps<T>) {
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
                  {column.header}
                </th>
              ))}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
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
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      className="rounded-md border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"
                      aria-label="Delete"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
