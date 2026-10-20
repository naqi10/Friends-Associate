import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { csvResponse, toCsv } from "@/lib/csv";
import { isStaff, permissionsFor } from "@/lib/permissions";

/** The CSV template for Import CSV, with two example rows. */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !isStaff(user.role) || !(await permissionsFor(user))("properties", "add")) {
    return NextResponse.json({ error: "You do not have permission to access this information." }, { status: 403 });
  }
  return csvResponse(
    "properties-template.csv",
    toCsv(
      ["title", "type", "listing", "city", "locality", "size", "price_pkr", "status", "project_slug", "description", "published"],
      [
        ["5 Marla House, Model Town", "House", "sale", "Rahim Yar Khan", "Model Town", "5 Marla", 9500000, "Available", "", "Corner house, double storey", "no"],
        ["Shop on Shahi Road", "Shop", "rent", "Rahim Yar Khan", "Shahi Road", "220 sq ft", 60000, "Available", "", "Ground floor", "yes"],
      ],
    ),
  );
}
