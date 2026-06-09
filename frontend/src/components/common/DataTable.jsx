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
  sortingState,
  onSortingChange,
}) {
  const [localSorting, setLocalSorting] = useState([]);
  const isServerSorting = sortingState !== undefined && onSortingChange !== undefined;
  const currentSorting = isServerSorting ? sortingState : localSorting;
  const handleSortingChange = isServerSorting ? onSortingChange : setLocalSorting;

  const table = useReactTable({
    data,
    columns,
    state: { sorting: currentSorting },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalElements / pageSize),
  });

  const totalPages = Math.ceil(totalElements / pageSize);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    const activePage = page;
    let start = Math.max(0, activePage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(0, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="data-table-container animate-fade-in" id="data-table-container">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-200 bg-slate-50/50">
        <div className="text-xs text-slate-500 font-medium">
          {totalElements > 0 ? (
            <span>
              Affichage de <span className="font-semibold text-slate-800">{page * pageSize + 1}</span> à{' '}
              <span className="font-semibold text-slate-800">{Math.min((page + 1) * pageSize, totalElements)}</span> sur{' '}
              <span className="font-semibold text-slate-800">{totalElements.toLocaleString('fr-FR')}</span> éléments
            </span>
          ) : (
            <span>Aucun élément à afficher</span>
          )}
        </div>
        {onPageSizeChange && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Afficher</span>
            <select
              id="page-size-select-top"
              value={pageSize}
              onChange={e => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0B192C] focus:border-[#0B192C] transition-colors cursor-pointer"
            >
              {[5, 10, 20, 50, 100].map(s => (
                <option key={s} value={s}>{s} lignes</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="data-table" role="table" id="data-table">
          <thead className={stickyHeader ? 'sticky top-0 z-10 bg-dark-900/95 backdrop-blur-sm' : ''}>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    style={{ width: header.column.columnDef.size }}
                    id={`th-${header.id}`}
                    className={header.column.getCanSort() ? 'select-none cursor-pointer' : ''}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                       {header.column.getCanSort() && (
                         <span className="ml-1">
                           {header.column.getIsSorted() === 'asc' ? (
                             <ChevronUp className="w-3.5 h-3.5 text-white" />
                           ) : header.column.getIsSorted() === 'desc' ? (
                             <ChevronDown className="w-3.5 h-3.5 text-white" />
                           ) : (
                             <ChevronsUpDown className="w-3.5 h-3.5 text-[#F3C623]/50 hover:text-white transition-colors" />
                           )}
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
                  <Loader2 className="w-8 h-8 text-[#0B192C] animate-spin mx-auto" />
                  <p className="text-slate-400 text-sm mt-3 font-medium">Chargement en cours...</p>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-slate-400">
                  <div className="text-4xl mb-3 opacity-30">📭</div>
                  <p className="text-sm font-medium">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
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

      {/* Footer: pagination */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 bg-slate-50/30">
        <div className="text-xs text-slate-500 font-medium">
          Page <span className="font-semibold text-slate-800">{totalPages > 0 ? page + 1 : 0}</span> sur{' '}
          <span className="font-semibold text-slate-800">{totalPages || 1}</span>
        </div>

        <div className="pagination" role="navigation" aria-label="Pagination">
          <button
            className="pagination-btn"
            onClick={() => onPageChange(0)}
            disabled={page === 0 || totalPages <= 1}
            id="btn-first-page"
            aria-label="Première page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            className="pagination-btn"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0 || totalPages <= 1}
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
              disabled={totalPages <= 1}
            >
              {p + 1}
            </button>
          ))}

          <button
            className="pagination-btn"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1 || totalPages <= 1}
            id="btn-next-page"
            aria-label="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            className="pagination-btn"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={page >= totalPages - 1 || totalPages <= 1}
            id="btn-last-page"
            aria-label="Dernière page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
