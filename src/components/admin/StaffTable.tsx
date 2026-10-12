"use client";

import Link from "next/link";
import { DataTable, dataTableColumns } from "@/components/DataTable";
import type { StaffRow } from "@/lib/data/staff";
import { ROLE_LABELS } from "@/lib/permission-catalog";

const col = dataTableColumns<StaffRow>();

const columns = col.columns([
  col.accessor("name", {
    header: "Name",
    cell: (info) => (
      <Link href={`/admin/staff/${info.row.original.id}`} className="font-medium text-teal-800 hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  col.accessor("email", { header: "Email" }),
  col.accessor((r) => ROLE_LABELS[r.role] ?? r.role, {
    id: "role",
    header: "Role",
    cell: (info) => (
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${info.row.original.role === "admin" ? "bg-teal-50 text-teal-800" : "bg-stone-100 text-stone-700"}`}
      >
        {info.getValue()}
      </span>
    ),
  }),
  col.accessor("city", { header: "City" }),
  col.accessor((r) => (r.active ? "Active" : "Disabled"), {
    id: "status",
    header: "Account",
    cell: (info) => (
      <span className={info.getValue() === "Active" ? "text-stone-700" : "text-red-700"}>{info.getValue()}</span>
    ),
  }),
  col.accessor("lastLoginAt", {
    header: "Last login",
    enableGlobalFilter: false,
    cell: (info) => {
      const v = info.getValue();
      return v ? new Date(v).toLocaleString("en-GB", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) : <span className="text-stone-400">Never</span>;
    },
  }),
]);

export function StaffTable({ rows }: { rows: StaffRow[] }) {
  return <DataTable data={rows} columns={columns} searchPlaceholder="Search name, email, role or city" emptyMessage="No staff accounts." />;
}
