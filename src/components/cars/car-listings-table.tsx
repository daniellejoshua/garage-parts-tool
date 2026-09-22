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
  ImagesIcon,
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
import { DeleteCarButton } from "@/components/cars/delete-car-button";

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
}: {
  cars: CarRow[];
  context: CarNavContext;
}) {
  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const columns = [
    columnHelper.accessor("title", {
      header: "Title",
      cell: ({ row, getValue }) => (
        <div className="flex flex-col gap-0.5">
          <Link
            href={carViewPath(context.brandSlug, context.modelSlug, row.id)}
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            {getValue()}
          </Link>
          <span className="text-xs text-muted-foreground">
            Listing #{row.id}
          </span>
        </div>
      ),
    }),
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
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            render={<Link href={carViewPath(context.brandSlug, context.modelSlug, row.id)} />}
          >
            <EyeIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            render={<Link href={carEditPath(context.brandSlug, context.modelSlug, row.id)} />}
            aria-label={`Edit ${row.original.title}`}
          >
            <PencilIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            render={<Link href={`${carEditPath(context.brandSlug, context.modelSlug, row.id)}?section=media`} />}
            aria-label={`Manage images for ${row.original.title}`}
            title="Manage Images"
          >
            <ImagesIcon />
          </Button>
          <DeleteCarButton
            context={context}
            carId={row.id}
            carTitle={row.original.title}
            variant="ghost"
            size="icon"
            iconOnly
          />
        </div>
      ),
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
        <p className="text-sm text-muted-foreground">
          {filteredCount} of {cars.length} listing{cars.length === 1 ? "" : "s"}
        </p>
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
