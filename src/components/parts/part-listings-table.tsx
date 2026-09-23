"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  EyeIcon,
  PencilIcon,
  SearchIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PartRow } from "@/lib/server/serialize-part";
import type { PartNavContext } from "@/lib/server/part-actions";
import { partEditPath, partViewPath } from "@/lib/part-routes";
import { displayValue, formatDateTime, formatPrice, formatWhole } from "@/lib/car-format";
import { DeletePartButton } from "@/components/parts/delete-part-button";
import { ExportButton } from "@/components/app/export-button";

const columnHelper = createColumnHelper<PartRow>();

export interface PartListingContext extends PartNavContext {
  brandName: string;
  modelName: string;
}

function SortHeader({ column, children }: {
  column: Column<PartRow>;
  children: ReactNode;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={`flex items-center gap-1 whitespace-nowrap select-none hover:text-foreground`}
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUpIcon className="size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDownIcon className="size-3.5" />
      ) : (
        <ChevronsUpDownIcon className="size-3.5 opacity-50" />
      )}
    </button>
  );
}

export function PartListingsTable({
  parts,
  context,
  contexts,
  exportScope,
}: {
  parts: PartRow[];
  context?: PartNavContext;
  contexts?: Record<string, PartListingContext>;
  exportScope?: "part";
}) {
  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const vehicleColumns = context
    ? []
    : [
        columnHelper.display({
          id: "vehicle",
          header: "Vehicle context",
          cell: ({ row }) => {
            const rowContext = contexts?.[row.id];
            return rowContext
              ? `${rowContext.brandName} ${rowContext.modelName}`
              : "No compatibility";
          },
        }),
      ];

  const columns = [
    columnHelper.accessor("title", {
      header: "Title",
      cell: ({ row, getValue }) => {
        const rowContext = context ?? contexts?.[row.id];
        return (
          <div className="flex flex-col gap-0.5">
          {rowContext ? (
            <Link
              href={partViewPath(rowContext.brandSlug, rowContext.modelSlug, row.id)}
              className="font-medium text-foreground transition-colors hover:text-primary"
            >
              {getValue()}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{getValue()}</span>
          )}
          <span className="text-xs text-muted-foreground">
            Listing #{row.id}
          </span>
        </div>
        );
      },
    }),
    ...vehicleColumns,
    columnHelper.accessor("category", {
      header: "Category",
      cell: ({ getValue }) => <Badge variant="secondary">{getValue()}</Badge>,
    }),
    columnHelper.accessor("brand", {
      header: "Part Brand",
      cell: ({ getValue }) => displayValue(getValue()),
    }),
    columnHelper.accessor("condition", {
      header: "Condition",
      cell: ({ getValue }) => <Badge variant="outline">{getValue()}</Badge>,
    }),
    columnHelper.accessor("price", {
      header: "Price",
      cell: ({ getValue }) => (
        <span className="block text-right">{formatPrice(getValue())}</span>
      ),
    }),
    columnHelper.accessor("quantity", {
      header: "Qty",
      cell: ({ getValue }) => formatWhole(getValue()),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => <Badge variant="secondary">{getValue()}</Badge>,
    }),
    columnHelper.accessor("city", {
      header: "City",
      cell: ({ getValue }) => displayValue(getValue()),
    }),
    columnHelper.accessor("createdAt", {
      header: "Added",
      cell: ({ getValue }) => formatDateTime(getValue()),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const rowContext = context ?? contexts?.[row.id];
        if (!rowContext) {
          return <span className="text-xs text-muted-foreground">Unavailable</span>;
        }

        return (
          <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            render={<Link href={partViewPath(rowContext.brandSlug, rowContext.modelSlug, row.id)} />}
            aria-label={`View ${row.original.title}`}
          >
            <EyeIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            render={<Link href={partEditPath(rowContext.brandSlug, rowContext.modelSlug, row.id)} />}
            aria-label={`Edit ${row.original.title}`}
          >
            <PencilIcon />
          </Button>
          <DeletePartButton
            context={rowContext}
            partId={row.id}
            partTitle={row.original.title}
            variant="ghost"
            size="icon"
            iconOnly
          />
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: parts,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
    getRowId: (row) => row.id,
  });

  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Search listings"
            className="pl-10"
            aria-label="Search listings"
          />
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-sm text-muted-foreground">{filteredCount} result(s)</span>
          {exportScope ? <ExportButton scope={exportScope} disabled={filteredCount === 0} /> : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.getIsSorted() ? "text-foreground" : ""
                    }
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <SortHeader column={header.column}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </SortHeader>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No matching listings.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
