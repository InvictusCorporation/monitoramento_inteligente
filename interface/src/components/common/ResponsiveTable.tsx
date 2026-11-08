import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Coluna usada como título do cartão no celular */
  primary?: boolean;
}

/** Tabela no desktop, cartões empilhados no celular. */
export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  actions,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  actions?: (row: T) => ReactNode;
}) {
  const primary = (columns.find((c) => c.primary) ?? columns[0])!;
  const rest = columns.filter((c) => c !== primary);
  return (
    <>
      <div className="hidden overflow-hidden rounded-lg border bg-card shadow-panel md:block">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b bg-secondary/60 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-2.5 font-semibold", c.className)}>
                  {c.header}
                </th>
              ))}
              {actions && <th className="px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b last:border-0 hover:bg-secondary/40">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
                {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <div key={rowKey(row)} className="rounded-lg border bg-card p-3 shadow-panel">
            <div className="text-sm font-semibold">{primary.cell(row)}</div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
              {rest.map((c) => (
                <div key={c.key}>
                  <dt className="text-[11px] text-muted-foreground">{c.header}</dt>
                  <dd>{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
            {actions && <div className="mt-3 flex justify-end">{actions(row)}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
