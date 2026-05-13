'use client';

/**
 * AdminDataTable
 *
 * A reusable TanStack Table v8 wrapper styled to match the admin design system.
 * Provides: column sorting, global search filter, configurable page sizes,
 * client-side pagination, and a shimmer skeleton while loading.
 *
 * Usage:
 *   const columns = useMemo<ColumnDef<MyRow>[]>(() => [...], []);
 *   <AdminDataTable columns={columns} data={rows} loading={loading} />
 */

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { C } from '@/components/Logo';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminDataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  loading?: boolean;
  /** Number of skeleton rows shown while loading. Default: 6 */
  skeletonRows?: number;
  /** Placeholder text for the global search box */
  searchPlaceholder?: string;
  /** Hide the search bar */
  hideSearch?: boolean;
  /** Extra controls rendered to the right of the search bar */
  toolbar?: React.ReactNode;
  /** Empty state message */
  emptyMessage?: React.ReactNode;
  /** Default page size. Default: 10 */
  defaultPageSize?: number;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const thBase: React.CSSProperties = {
  padding: '11px 14px',
  textAlign: 'left',
  color: C.gray,
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  borderBottom: `1px solid rgba(14,165,233,0.15)`,
  whiteSpace: 'nowrap',
  userSelect: 'none',
  background: `rgba(14,165,233,0.05)`,
};

const tdBase: React.CSSProperties = {
  padding: '12px 14px',
  color: C.white,
  fontSize: '0.84rem',
  borderBottom: `1px solid rgba(14,165,233,0.08)`,
  verticalAlign: 'middle',
};

const btnBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  borderRadius: 6,
  background: C.navyLight,
  border: `1px solid rgba(14,165,233,0.2)`,
  color: C.white,
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '0.78rem',
  fontWeight: 600,
  transition: 'all 0.15s',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '13px 14px', borderBottom: `1px solid rgba(14,165,233,0.08)` }}>
          <div style={{
            height: 13,
            width: `${55 + (i * 17) % 40}%`,
            borderRadius: 5,
            background: `linear-gradient(90deg, ${C.navyLight} 25%, rgba(14,165,233,0.09) 50%, ${C.navyLight} 75%)`,
            backgroundSize: '400% 100%',
            animation: 'adt-shimmer 1.4s infinite',
          }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ direction }: { direction: 'asc' | 'desc' | false }) {
  if (direction === 'asc') return <ChevronUp size={12} color={C.teal} />;
  if (direction === 'desc') return <ChevronDown size={12} color={C.teal} />;
  return <ChevronsUpDown size={12} color={C.grayDark} />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminDataTable<TData>({
  columns,
  data,
  loading = false,
  skeletonRows = 6,
  searchPlaceholder = 'Search…',
  hideSearch = false,
  toolbar,
  emptyMessage,
  defaultPageSize = 10,
}: AdminDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: defaultPageSize });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnFilters, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: true,
  });

  const { rows } = table.getRowModel();
  const colCount = columns.length;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const from = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  return (
    <div>
      {/* Toolbar */}
      {(!hideSearch || toolbar) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {!hideSearch && (
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.grayDark, pointerEvents: 'none' }} />
              <input
                type="text"
                value={globalFilter}
                onChange={e => { setGlobalFilter(e.target.value); setPagination(p => ({ ...p, pageIndex: 0 })); }}
                placeholder={searchPlaceholder}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: 8,
                  background: C.navyLight,
                  border: `1px solid rgba(14,165,233,0.2)`,
                  color: C.white,
                  fontSize: '0.82rem',
                  fontFamily: "'DM Sans', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          {toolbar}
          {/* Page size selector */}
          <select
            value={pageSize}
            onChange={e => { table.setPageSize(Number(e.target.value)); }}
            style={{ padding: '8px 10px', borderRadius: 8, background: C.navyLight, border: `1px solid rgba(14,165,233,0.2)`, color: C.white, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' }}
            aria-label="Rows per page"
          >
            {[10, 20, 50, 100].map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      <div style={{ background: C.navyMid, borderRadius: 12, border: `1px solid rgba(14,165,233,0.15)`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        colSpan={header.colSpan}
                        style={{
                          ...thBase,
                          cursor: canSort ? 'pointer' : 'default',
                          color: sorted ? C.teal : C.gray,
                          ...(header.column.columnDef.meta as React.CSSProperties | undefined),
                        }}
                        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                      >
                        {header.isPlaceholder ? null : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && <SortIcon direction={sorted} />}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: skeletonRows }).map((_, i) => (
                  <SkeletonRow key={i} cols={colCount} />
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colCount} style={{ padding: '48px 16px', textAlign: 'center', color: C.gray, fontSize: '0.9rem' }}>
                    {emptyMessage ?? 'No records found.'}
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr
                    key={row.id}
                    style={{ transition: 'background 0.12s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'rgba(14,165,233,0.04)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        style={{
                          ...tdBase,
                          ...(cell.column.columnDef.meta as React.CSSProperties | undefined),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {!loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderTop: `1px solid rgba(14,165,233,0.1)`,
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <span style={{ color: C.gray, fontSize: '0.76rem' }}>
              {totalFiltered === 0
                ? 'No results'
                : `${from}–${to} of ${totalFiltered}`}
            </span>

            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {/* First */}
              <button
                type="button"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                style={{ ...btnBase, opacity: !table.getCanPreviousPage() ? 0.35 : 1, cursor: !table.getCanPreviousPage() ? 'not-allowed' : 'pointer' }}
                aria-label="First page"
              >
                <ChevronsLeft size={13} />
              </button>
              {/* Prev */}
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                style={{ ...btnBase, opacity: !table.getCanPreviousPage() ? 0.35 : 1, cursor: !table.getCanPreviousPage() ? 'not-allowed' : 'pointer' }}
                aria-label="Previous page"
              >
                <ChevronLeft size={13} />
              </button>

              {/* Page numbers — show up to 5 around current */}
              {Array.from({ length: pageCount }, (_, i) => i)
                .filter(i => Math.abs(i - pageIndex) <= 2)
                .map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => table.setPageIndex(i)}
                    style={{
                      ...btnBase,
                      minWidth: 30,
                      background: i === pageIndex ? `linear-gradient(135deg, ${C.teal}, ${C.turquoise})` : C.navyLight,
                      color: i === pageIndex ? C.navy : C.white,
                      border: i === pageIndex ? 'none' : `1px solid rgba(14,165,233,0.2)`,
                      fontWeight: i === pageIndex ? 700 : 500,
                    }}
                    aria-label={`Page ${i + 1}`}
                    aria-current={i === pageIndex ? 'page' : undefined}
                  >
                    {i + 1}
                  </button>
                ))}

              {/* Next */}
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                style={{ ...btnBase, opacity: !table.getCanNextPage() ? 0.35 : 1, cursor: !table.getCanNextPage() ? 'not-allowed' : 'pointer' }}
                aria-label="Next page"
              >
                <ChevronRight size={13} />
              </button>
              {/* Last */}
              <button
                type="button"
                onClick={() => table.setPageIndex(pageCount - 1)}
                disabled={!table.getCanNextPage()}
                style={{ ...btnBase, opacity: !table.getCanNextPage() ? 0.35 : 1, cursor: !table.getCanNextPage() ? 'not-allowed' : 'pointer' }}
                aria-label="Last page"
              >
                <ChevronsRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes adt-shimmer {
          0%   { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}
