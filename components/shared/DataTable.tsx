"use client";

import { useState } from "react";

/**
 * Reusable table component with spec-compliant pagination.
 *
 * Pagination rules (global):
 *  - First page  → hide PREV
 *  - Last page   → hide NEXT
 *  - Single page → hide both
 *  - Uses visibility:hidden (not display:none) to prevent layout shift
 */

type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  emptyMessage?: string;
  searchPlaceholder?: string;
  searchKey?: keyof T;
};

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  pageSize = 10,
  emptyMessage = "No data available.",
  searchPlaceholder = "Search…",
  searchKey,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = searchKey
    ? data.filter((row) =>
        String(row[searchKey] ?? "")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : data;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const sliced = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const isFirst = currentPage === 1;
  const isLast = currentPage === totalPages;
  const isSingle = totalPages <= 1;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      {searchKey && (
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="input-theme w-full max-w-sm"
        />
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-theme">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-theme bg-hover">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {sliced.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sliced.map((row, idx) => (
                <tr
                  key={idx}
                  className="transition-colors duration-150 hover:bg-hover"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-primary">
                      {col.render
                        ? col.render(row)
                        : String(row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-secondary">
        <span>
          Page {currentPage} of {totalPages} · {filtered.length} total
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={isFirst}
            className="rounded-lg border border-theme bg-surface px-3 py-1.5 font-medium transition hover:bg-hover disabled:opacity-40"
            style={{ visibility: isSingle || isFirst ? "hidden" : "visible" }}
          >
            ← Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={isLast}
            className="rounded-lg border border-theme bg-surface px-3 py-1.5 font-medium transition hover:bg-hover disabled:opacity-40"
            style={{ visibility: isSingle || isLast ? "hidden" : "visible" }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
