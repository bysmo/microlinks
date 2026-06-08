import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
         ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';

export default function DataTable({
  data = [],
  columns = [],
  totalElements = 0,
  page = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  emptyMessage = 'Aucune donnée disponible',
  onRowClick,
  stickyHeader = true,
}) {
  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalElements / pageSize),
  });

  const totalPages = Math.ceil(totalElements / pageSize);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(0, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="data-table-container animate-fade-in" id="data-table-container">

      {/* Table */}
      <div className="overflow-auto">
        <table className="data-table" role="table" id="data-table">
          <thead className={stickyHeader ? 'sticky top-0 z-10 bg-dark-900/95 backdrop-blur-sm' : ''}>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.column.columnDef.size }}
                    id={`th-${header.id}`}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="ml-1 opacity-50">
                          {header.column.getIsSorted() === 'asc'
                            ? <ChevronUp className="w-3 h-3" />
                            : header.column.getIsSorted() === 'desc'
                              ? <ChevronDown className="w-3 h-3" />
                              : <ChevronsUpDown className="w-3 h-3" />
                          }
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
                  <p className="text-dark-400 text-sm mt-3">Chargement en cours...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-dark-400">
                  <div className="text-4xl mb-3 opacity-30">📭</div>
                  <p className="text-sm">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                  id={`row-${row.id}`}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: pagination + info */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-white/10">

        {/* Info */}
        <div className="flex items-center gap-4 text-dark-400 text-xs">
          <span>
            {totalElements > 0
              ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, totalElements)} sur ${totalElements.toLocaleString('fr-FR')}`
              : '0 résultat'
            }
          </span>
          {onPageSizeChange && (
            <div className="flex items-center gap-2">
              <label htmlFor="page-size-select" className="text-dark-400">Par page</label>
              <select
                id="page-size-select"
                value={pageSize}
                onChange={e => onPageSizeChange(Number(e.target.value))}
                className="bg-dark-800 border border-dark-600 text-white rounded px-2 py-1 text-xs"
              >
                {[10, 20, 50, 100].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" role="navigation" aria-label="Pagination">
            <button
              className="pagination-btn"
              onClick={() => onPageChange(0)}
              disabled={page === 0}
              id="btn-first-page"
              aria-label="Première page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              className="pagination-btn"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              id="btn-prev-page"
              aria-label="Page précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {getPageNumbers().map(p => (
              <button
                key={p}
                className={`pagination-btn ${p === page ? 'active' : ''}`}
                onClick={() => onPageChange(p)}
                id={`btn-page-${p}`}
                aria-label={`Page ${p + 1}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p + 1}
              </button>
            ))}

            <button
              className="pagination-btn"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              id="btn-next-page"
              aria-label="Page suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              className="pagination-btn"
              onClick={() => onPageChange(totalPages - 1)}
              disabled={page >= totalPages - 1}
              id="btn-last-page"
              aria-label="Dernière page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
