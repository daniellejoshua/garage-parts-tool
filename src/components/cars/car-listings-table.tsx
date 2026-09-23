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
import { CarRow } from "@/lib/server/serialize-car";
import type { CarNavContext } from "@/lib/server/car-actions";
import { carEditPath, carViewPath } from "@/lib/car-routes";
import { displayValue, formatDateTime, formatPrice, formatWhole } from "@/lib/car-format";
import { listingStatusClassName } from "@/lib/listing-status";
import { DeleteCarButton } from "@/components/cars/delete-car-button";
import { toSlug } from "@/lib/reference/slug";
import { ExportButton } from "@/components/app/export-button";

const columnHelper = createColumnHelper<CarRow>();

function SortHeader({ column, children }: {
  column: Column<CarRow>;
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

export function CarListingsTable({
  cars,
  context,
  exportScope,
}: {
  cars: CarRow[];
  context?: CarNavContext;
  exportScope?: "car";
}) {
  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const vehicleColumns = context
    ? []
    : [
        columnHelper.accessor("brand", { header: "Brand" }),
        columnHelper.accessor("model", { header: "Model" }),
      ];

  const columns = [
    columnHelper.accessor("title", {
      header: "Title",
      cell: ({ row, getValue }) => (
        <div className="flex items-center gap-2">
          <Link
            href={carViewPath(
              context?.brandSlug ?? toSlug(row.original.brand),
              context?.modelSlug ?? toSlug(row.original.model),
              row.id,
            )}
            title={getValue()}
            className="max-w-[220px] truncate font-medium text-foreground transition-colors hover:text-primary"
          >
            {getValue()}
          </Link>
          <span className="text-xs text-muted-foreground">#{row.id}</span>
        </div>
      ),
    }),
    ...vehicleColumns,
    columnHelper.accessor("sellerId", {
      header: "Seller",
      cell: ({ getValue }) => displayValue(getValue()),
    }),
    columnHelper.accessor("year", {
      header: "Year",
      cell: ({ getValue }) => getValue(),
    }),
    columnHelper.accessor("price", {
      header: "Price",
      cell: ({ getValue }) => (
        <span className="block text-right">{formatPrice(getValue())}</span>
      ),
    }),
    columnHelper.accessor("mileageKm", {
      header: "Mileage (km)",
      cell: ({ getValue }) => formatWhole(getValue()),
    }),
    columnHelper.accessor("condition", {
      header: "Condition",
      cell: ({ getValue }) => displayValue(getValue()),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ getValue }) => <Badge className={listingStatusClassName(getValue())}>{getValue()}</Badge>,
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
        const rowContext = context ?? {
          brandSlug: toSlug(row.original.brand),
          modelSlug: toSlug(row.original.model),
        };

        return (
          <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href={carViewPath(rowContext.brandSlug, rowContext.modelSlug, row.id)} />}
            aria-label={`View ${row.original.title}`}
          >
            <EyeIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href={carEditPath(rowContext.brandSlug, rowContext.modelSlug, row.id)} />}
            aria-label={`Edit ${row.original.title}`}
          >
            <PencilIcon />
          </Button>
          <DeleteCarButton
            context={rowContext}
            carId={row.id}
            carTitle={row.original.title}
            variant="ghost"
            size="icon-sm"
            iconOnly
          />
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: cars,
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

  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const filteredCount = table.getFilteredRowModel().rows.length;
  const rangeStart = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, filteredCount);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Search listings"
            className="h-8 pl-10 text-sm"
            aria-label="Search listings"
          />
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {filteredCount === 0
            ? "No results"
            : `Showing ${rangeStart}–${rangeEnd} of ${filteredCount}`}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {pageCount === 0 ? 0 : pageIndex + 1}/{pageCount}
          </span>
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
