'use client';

import React from 'react';

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
}

interface Column<T> {
  key: keyof T | string;
  header: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
}

export function Table<T extends { id: string }>({
  data,
  columns,
  loading = false,
  onRowClick,
  actions,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="app-card p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-glass-10 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="app-card p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-text-60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-foreground">Nenhum dado encontrado</h3>
        <p className="mt-1 text-sm text-text-80">
          Não há registros para exibir no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="app-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-glass-10">
          <thead className="bg-glass-5">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-text-60 uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.header}
                </th>
              ))}
              {actions && <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-60 uppercase tracking-wider">Ações</th>}
            </tr>
          </thead>
          <tbody className="bg-glass-5 divide-y divide-glass-10">
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`hover:bg-glass-10 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              >
                {columns.map((column) => (
                  <td
                    key={String(column.key)}
                    className={`px-6 py-4 whitespace-nowrap text-sm text-text-80 ${column.className || ''}`}
                  >
                    {(() => {
                      const value = (row as Record<string, unknown>)[String(column.key)];
                      if (column.render) return column.render(value, row);
                      return String(value ?? '-');
                    })()}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

