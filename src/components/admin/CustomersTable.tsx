"use client";

import Link from "next/link";
import { DataTable, dataTableColumns } from "@/components/DataTable";
import type { CustomerRow } from "@/lib/data/customers";
import { formatPkr } from "@/lib/format";

const col = dataTableColumns<CustomerRow>();

// Module scope keeps column identity stable across renders, as Table v9 requires.
const columns = col.columns([
  col.accessor("name", {
    header: "Name",
    cell: (info) => (
      <Link href={`/admin/customers/${info.row.original.id}`} className="font-medium text-teal-800 hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  col.accessor("email", { header: "Email" }),
  col.accessor("phone", { header: "Phone" }),
  col.accessor("city", { header: "City" }),
  col.accessor("bookings", { header: "Bookings", enableGlobalFilter: false }),
  col.accessor("outstandingPkr", {
    header: "Outstanding",
    enableGlobalFilter: false,
    cell: (info) => formatPkr(info.getValue()),
  }),
  col.accessor((r) => (r.feePaidAt ? "Unlocked" : "Locked"), {
    id: "downloads",
    header: "Downloads",
    cell: (info) => (
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${info.getValue() === "Unlocked" ? "bg-teal-50 text-teal-800" : "bg-amber-50 text-amber-800"}`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  col.accessor((r) => (r.active ? "Active" : "Disabled"), {
    id: "status",
    header: "Account",
    cell: (info) => (
      <span className={info.getValue() === "Active" ? "text-stone-700" : "text-red-700"}>{info.getValue()}</span>
    ),
  }),
]);

export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      searchPlaceholder="Search name, email, phone or city"
      emptyMessage="No customers yet. Add the first buyer account."
    />
  );
}
