"use client";

import Link from "next/link";
import { DataTable, dataTableColumns } from "@/components/DataTable";
import type { BookingRow } from "@/lib/data/bookings";
import { formatDate, formatPkr } from "@/lib/format";

const col = dataTableColumns<BookingRow>();

const columns = col.columns([
  col.accessor("buyerName", {
    header: "Buyer",
    cell: (info) => (
      <Link href={`/admin/customers/${info.row.original.buyerId}`} className="hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  col.accessor("propertyTitle", {
    header: "Property",
    cell: (info) => (
      <Link href={`/admin/bookings/${info.row.original.id}`} className="font-medium text-teal-800 hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  col.accessor("projectName", { header: "Project" }),
  col.accessor("totalPricePkr", { header: "Total", enableGlobalFilter: false, cell: (i) => formatPkr(i.getValue()) }),
  col.accessor("paidPkr", { header: "Paid", enableGlobalFilter: false, cell: (i) => formatPkr(i.getValue()) }),
  col.accessor("outstandingPkr", { header: "Outstanding", enableGlobalFilter: false, cell: (i) => formatPkr(i.getValue()) }),
  col.accessor("nextPaymentDate", {
    header: "Next due",
    enableGlobalFilter: false,
    cell: (i) => (
      <span>
        {formatDate(i.getValue())}
        <span className="block text-xs text-stone-500">{formatPkr(i.row.original.nextPaymentAmountPkr)}</span>
      </span>
    ),
  }),
  col.accessor("propertyStatus", { header: "Unit" }),
]);

export function BookingsTable({ rows }: { rows: BookingRow[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      searchPlaceholder="Search buyer, property or project"
      emptyMessage="No bookings yet."
    />
  );
}
