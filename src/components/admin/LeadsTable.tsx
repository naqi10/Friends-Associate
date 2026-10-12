"use client";

import Link from "next/link";
import { DataTable, dataTableColumns } from "@/components/DataTable";
import { LEAD_SOURCES, LEAD_STATUSES, labelOf } from "@/lib/catalog";
import type { LeadRow } from "@/lib/data/leads";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-amber-100 text-amber-900",
  contacted: "bg-sky-100 text-sky-900",
  requirement_received: "bg-indigo-100 text-indigo-900",
  quotation_pending: "bg-violet-100 text-violet-900",
  quotation_sent: "bg-fuchsia-100 text-fuchsia-900",
  follow_up: "bg-orange-100 text-orange-900",
  converted: "bg-teal-100 text-teal-900",
  closed: "bg-stone-200 text-stone-700",
};

const col = dataTableColumns<LeadRow>();

const columns = col.columns([
  col.accessor("createdAt", {
    header: "Received",
    enableGlobalFilter: false,
    cell: (i) => new Date(i.getValue()).toLocaleDateString("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short" }),
  }),
  col.accessor("name", {
    header: "Name",
    cell: (i) => (
      <Link href={`/sales/leads/${i.row.original.id}`} className="font-medium text-teal-800 hover:underline">
        {i.getValue()}
      </Link>
    ),
  }),
  col.accessor("phone", { header: "Phone" }),
  col.accessor("interest", { header: "Interest" }),
  col.accessor("city", { header: "City" }),
  col.accessor((r) => labelOf(LEAD_SOURCES, r.source), { id: "source", header: "Source" }),
  col.accessor((r) => labelOf(LEAD_STATUSES, r.status), {
    id: "status",
    header: "Status",
    cell: (i) => (
      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[i.row.original.status] ?? "bg-stone-100"}`}>
        {i.getValue()}
      </span>
    ),
  }),
  col.accessor((r) => r.followUpDate ?? "", { id: "followUp", header: "Follow-up", enableGlobalFilter: false }),
  col.accessor((r) => r.assignedTo ?? "—", { id: "assigned", header: "Assigned" }),
]);

export function LeadsTable({ rows }: { rows: LeadRow[] }) {
  return <DataTable data={rows} columns={columns} searchPlaceholder="Search name, phone, interest, status…" emptyMessage="No leads yet." pageSize={25} />;
}
