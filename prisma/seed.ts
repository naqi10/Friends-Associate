import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { IDS } from "../src/lib/ids";
import { HERO_DEFAULTS } from "../src/lib/content-defaults";
import { DEFAULT_GRANTS } from "../src/lib/permission-catalog";
import { applyRestructure } from "./sample-content";

const prisma = new PrismaClient();
const DEMO_PASSWORD_HASH = bcrypt.hashSync("Faryk@2026", 10);

async function main() {
  // The seed wipes every table. Never let it run against live customer data by accident.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED_RESET !== "yes") {
    throw new Error("Refusing to seed in production. Set ALLOW_SEED_RESET=yes to wipe and reseed.");
  }

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.loginAttempt.deleteMany(),
    prisma.contentBlock.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.inquiry.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.news.deleteMany(),
    prisma.document.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.session.deleteMany(),
    prisma.property.deleteMany(),
    prisma.projectListItem.deleteMany(),
    prisma.project.deleteMany(),
    prisma.user.deleteMany(),
    prisma.managementMember.deleteMany(),
    prisma.office.deleteMany(),
    prisma.company.deleteMany(),
    prisma.siteSettings.deleteMany(),
  ]);

  await prisma.company.create({
    data: {
      id: 1,
      name: "FARYK",
      tagline: "From ideas to execution",
      website: "FARYK.com",
      email: "hello@faryk.com",
      whatsapp: "+92 300 3279500",
      mission:
        "Deliver architecture, construction and property development with transparency and quality across Pakistan's major growth corridors.",
      vision: "To be the trusted partner for residential and commercial buyers from first sketch to handover.",
      experience: "18 years across residential, commercial and infrastructure works.",
      documentDownloadFeePkr: 25000,
    },
  });

  await prisma.siteSettings.create({
    data: {
      id: 1,
      extraCitiesEnabled: false,
      whatsappAutomationEnabled: false,
      paymentGatewayEnabled: false,
    },
  });

  await prisma.contentBlock.create({ data: { ...HERO_DEFAULTS } });

  for (const o of [
    { id: "o1", city: "Lahore", address: "Plaza 12, MM Alam Road, Gulberg III", phone: "+92 42 111 32795", sortOrder: 1 },
    { id: "o2", city: "Karachi", address: "Suite 5, The Forum, Clifton Block 9", phone: "+92 21 111 32795", sortOrder: 2 },
    { id: "o3", city: "Rahim Yar Khan", address: "Canal Road Sales Office", phone: "+92 68 111 32795", sortOrder: 3 },
  ]) {
    await prisma.office.create({ data: o });
  }

  for (const m of [
    { id: "m1", name: "Farhan Younas", title: "Chief Executive", sortOrder: 1 },
    { id: "m2", name: "Amina Khalid", title: "Director, Architecture", sortOrder: 2 },
    { id: "m3", name: "Tariq Mehmood", title: "Director, Construction", sortOrder: 3 },
  ]) {
    await prisma.managementMember.create({ data: m });
  }

  const projects = [
    {
      id: IDS.projects.lahore,
      slug: "faryk-residences-lahore",
      name: "FARYK Residences Lahore",
      city: "Lahore",
      location: "DHA Phase 8",
      developer: "FARYK Developments",
      description:
        "Premium residential plots and villas with club, mosque and landscaped parks. Sample marketing copy — replace via admin when final brochures arrive.",
      status: "Under construction",
      expectedCompletion: "Q4 2027",
      contactPerson: "Sales Desk Lahore",
      contactPhone: "+92 42 111 32795",
      progressPercent: 62,
      type: "Residential",
      imagePath: "/images/projects/lahore.jpg",
      masterPlan: "LHR-masterplan.pdf",
      sitePlan: "LHR-siteplan.pdf",
      pricingLabel: "PKR 2.4 Cr – 9.8 Cr",
      paymentPlan: "20% booking, 40% in 8 quarterly instalments, 40% on possession",
      availableUnits: 42,
      seoTitle: "FARYK Residences Lahore | DHA Phase 8 Plots & Villas",
      seoDescription: "Explore FARYK Residences Lahore — residential development in DHA Phase 8.",
    },
    {
      id: IDS.projects.karachi,
      slug: "faryk-harbour-karachi",
      name: "FARYK Harbour Karachi",
      city: "Karachi",
      location: "Clifton Block 8",
      developer: "FARYK Developments",
      description: "Mixed-use sea-facing apartments and commercial plates in Clifton.",
      status: "Finishing",
      expectedCompletion: "Q2 2027",
      contactPerson: "Sales Desk Karachi",
      contactPhone: "+92 21 111 32795",
      progressPercent: 81,
      type: "Mixed-use",
      imagePath: "/images/projects/karachi.jpg",
      masterPlan: "KHI-masterplan.pdf",
      sitePlan: "KHI-siteplan.pdf",
      pricingLabel: "PKR 5.4 Cr – 7.5 Cr",
      paymentPlan: "25% booking, 50% construction linked, 25% on possession",
      availableUnits: 18,
      seoTitle: "FARYK Harbour Karachi | Clifton Mixed-Use",
      seoDescription: "FARYK Harbour Karachi — apartments and office plates at Clifton Block 8.",
    },
    {
      id: IDS.projects.ryk,
      slug: "faryk-canal-estate-ryk",
      name: "FARYK Canal Estate RYK",
      city: "Rahim Yar Khan",
      location: "Canal Road",
      developer: "FARYK Developments",
      description: "Canal-side houses and commercial shops on Canal Road, Rahim Yar Khan.",
      status: "Civil works",
      expectedCompletion: "Q3 2028",
      contactPerson: "Sales Desk RYK",
      contactPhone: "+92 68 111 32795",
      progressPercent: 34,
      type: "Residential",
      imagePath: "/images/projects/ryk.jpg",
      masterPlan: "RYK-masterplan.pdf",
      sitePlan: "RYK-siteplan.pdf",
      pricingLabel: "PKR 9.8 M – 18.5 M",
      paymentPlan: "15% booking, 60% in 12 instalments, 25% on possession",
      availableUnits: 56,
      seoTitle: "FARYK Canal Estate RYK | Canal Road",
      seoDescription: "FARYK Canal Estate on Canal Road, Rahim Yar Khan.",
    },
  ];

  for (const p of projects) {
    await prisma.project.create({ data: p });
  }

  const listItems = [
    ...["5 Marla", "10 Marla", "1 Kanal"].map((label, i) => ({
      projectId: IDS.projects.lahore,
      label,
      sortOrder: i,
      kind: "size",
    })),
    ...["Club & pool", "Mosque", "Kids play", "24/7 security", "Parks"].map((label, i) => ({
      projectId: IDS.projects.lahore,
      label,
      sortOrder: i + 10,
      kind: "amenity",
    })),
    ...["2 bed 1,150 sq ft", "3 bed 1,680 sq ft", "Office plate 2,200 sq ft"].map((label, i) => ({
      projectId: IDS.projects.karachi,
      label,
      sortOrder: i,
      kind: "floor_plan",
    })),
    ...["7 Marla", "10 Marla", "20x40 shop"].map((label, i) => ({
      projectId: IDS.projects.ryk,
      label,
      sortOrder: i,
      kind: "size",
    })),
  ];
  for (const item of listItems) {
    await prisma.projectListItem.create({ data: item });
  }

  const properties = [
    { id: IDS.properties.lhrPlot, projectId: IDS.projects.lahore, title: "1 Kanal Plot, Block C", type: "Plot", city: "Lahore", size: "1 Kanal", pricePkr: 98000000, status: "Booked", imagePath: "/images/properties/plot-lhr.jpg" },
    { id: IDS.properties.lhrVilla, projectId: IDS.projects.lahore, title: "10 Marla Villa, Block A", type: "House", city: "Lahore", size: "10 Marla", pricePkr: 62000000, status: "Available", imagePath: "/images/properties/villa-lhr.jpg" },
    { id: IDS.properties.khiApt, projectId: IDS.projects.karachi, title: "3 Bed Sea-View Apartment", type: "Apartment", city: "Karachi", size: "1,680 sq ft", pricePkr: 54000000, status: "Booked", imagePath: "/images/properties/apt-khi.jpg" },
    { id: IDS.properties.khiOffice, projectId: IDS.projects.karachi, title: "Harbour Office Plate", type: "Office", city: "Karachi", size: "2,200 sq ft", pricePkr: 75000000, status: "Available", imagePath: "/images/properties/office-khi.jpg" },
    { id: IDS.properties.rykHouse, projectId: IDS.projects.ryk, title: "10 Marla Canal House", type: "House", city: "Rahim Yar Khan", size: "10 Marla", pricePkr: 18500000, status: "Booked", imagePath: "/images/properties/house-ryk.jpg" },
    { id: IDS.properties.rykShop, projectId: IDS.projects.ryk, title: "Commercial Shop 20x40", type: "Shop", city: "Rahim Yar Khan", size: "800 sq ft", pricePkr: 9800000, status: "Available", imagePath: "/images/properties/shop-ryk.jpg" },
  ];
  for (const prop of properties) {
    await prisma.property.create({ data: prop });
  }

  const users = [
    { id: IDS.users.ahmed, name: "Ahmed Malik", email: "ahmed.malik@example.com", role: "buyer", city: "Lahore", phone: "+92 300 1110001", cnic: "35202-1234567-1", documentDownloadPaidAt: new Date("2026-01-15") },
    { id: IDS.users.fatima, name: "Fatima Siddiqui", email: "fatima.siddiqui@example.com", role: "buyer", city: "Karachi", phone: "+92 300 1110002", cnic: "42101-7654321-2", documentDownloadPaidAt: new Date("2026-02-01") },
    { id: IDS.users.bilal, name: "Bilal Hussain", email: "bilal.hussain@example.com", role: "buyer", city: "Rahim Yar Khan", phone: "+92 300 1110003", cnic: "31303-9988776-3", documentDownloadPaidAt: null },
    { id: IDS.users.sales, name: "FARYK Sales", email: "sales@faryk.com", role: "sales", city: "Lahore", phone: "+92 42 111 32795", cnic: "", documentDownloadPaidAt: null },
    { id: IDS.users.pm, name: "FARYK Project Manager", email: "pm@faryk.com", role: "project_manager", city: "Karachi", phone: "+92 21 111 32795", cnic: "", documentDownloadPaidAt: null },
    { id: IDS.users.admin, name: "FARYK Admin", email: "admin@faryk.com", role: "admin", city: "Lahore", phone: "+92 42 111 32790", cnic: "", documentDownloadPaidAt: null },
  ];
  for (const u of users) {
    await prisma.user.create({
      data: { ...u, passwordHash: DEMO_PASSWORD_HASH },
    });
  }

  await prisma.booking.createMany({
    data: [
      { id: "bk1", userId: IDS.users.ahmed, propertyId: IDS.properties.lhrPlot, projectId: IDS.projects.lahore, status: "Instalments in progress", bookedOn: "2025-03-12", totalPricePkr: 98000000, paidPkr: 76222222, outstandingPkr: 21777778, paymentsReceived: 7, paymentsRemaining: 2, nextPaymentDate: "2026-10-15", nextPaymentAmountPkr: 10888889 },
      { id: "bk2", userId: IDS.users.fatima, propertyId: IDS.properties.khiApt, projectId: IDS.projects.karachi, status: "Finishing linked payments", bookedOn: "2024-11-02", totalPricePkr: 54000000, paidPkr: 40500000, outstandingPkr: 13500000, paymentsReceived: 6, paymentsRemaining: 2, nextPaymentDate: "2026-10-01", nextPaymentAmountPkr: 6750000 },
      { id: "bk3", userId: IDS.users.bilal, propertyId: IDS.properties.rykHouse, projectId: IDS.projects.ryk, status: "Civil-stage booking", bookedOn: "2025-08-20", totalPricePkr: 18500000, paidPkr: 5550000, outstandingPkr: 12950000, paymentsReceived: 3, paymentsRemaining: 9, nextPaymentDate: "2026-10-20", nextPaymentAmountPkr: 1387500 },
    ],
  });

  const publicDocs = [
    { id: "d-p1", audience: "public", name: "Company profile 2026", category: "Company", issuedOn: "2026-01-10", fileName: "FARYK-profile.pdf", projectId: null },
    { id: "d-p2", audience: "public", name: "Lahore master plan (public)", category: "Master plan", issuedOn: "2026-04-02", fileName: "LHR-masterplan.pdf", projectId: IDS.projects.lahore },
    { id: "d-p3", audience: "public", name: "Karachi Harbour brochure", category: "Brochure", issuedOn: "2026-05-18", fileName: "KHI-brochure.pdf", projectId: IDS.projects.karachi },
    { id: "d-p4", audience: "public", name: "RYK Canal Estate brochure", category: "Brochure", issuedOn: "2026-06-01", fileName: "RYK-brochure.pdf", projectId: IDS.projects.ryk },
  ];
  for (const d of publicDocs) {
    await prisma.document.create({ data: { ...d, userId: null, version: null, status: null } });
  }

  const buyerDocNames = [
    "Booking form",
    "Buyer agreement",
    "Sale/purchase agreement",
    "Payment receipts",
    "Allocation letter",
    "Possession documents",
    "Property plan/layout",
    "Approved project documents",
    "Construction-related documents",
    "Other company-issued documents",
  ];
  for (const userId of [IDS.users.ahmed, IDS.users.fatima, IDS.users.bilal]) {
    for (let i = 0; i < buyerDocNames.length; i++) {
      const name = buyerDocNames[i];
      let status = "Issued";
      if (name === "Possession documents") status = "Pending";
      if (name === "Allocation letter" && userId === IDS.users.bilal) status = "Pending";
      if (name === "Property plan/layout" || name === "Approved project documents") status = "Approved";
      await prisma.document.create({
        data: {
          id: `d-${userId}-${i}`,
          audience: "buyer",
          userId,
          projectId: null,
          name,
          category: name,
          issuedOn: "2026-03-01",
          version: `v1.${i}`,
          status,
          fileName: `${userId}-${i}.pdf`,
        },
      });
    }
  }

  await prisma.news.createMany({
    data: [
      { id: "n1", slug: "harbour-karachi-81-percent", title: "FARYK Harbour Karachi reaches 81% completion", publishedOn: "2026-09-12", excerpt: "Finishing works accelerate at Clifton Block 8.", body: "Harbour Karachi has reached 81% overall progress.", seoTitle: "Harbour Karachi 81% Progress | FARYK News", seoDescription: "Construction update for FARYK Harbour Karachi." },
      { id: "n2", slug: "lahore-10-marla-villas", title: "10 Marla villas released in Lahore", publishedOn: "2026-08-28", excerpt: "Limited inventory in Block A.", body: "A new batch of 10 Marla villas is available at FARYK Residences Lahore.", seoTitle: null, seoDescription: null },
      { id: "n3", slug: "canal-estate-civil-works", title: "Canal Estate RYK civil works update", publishedOn: "2026-07-15", excerpt: "Earthworks ongoing along Canal Road.", body: "FARYK Canal Estate RYK continues civil works with 34% overall progress.", seoTitle: null, seoDescription: null },
    ],
  });

  await prisma.lead.createMany({
    data: [
      { id: "l1", name: "Hassan Raza", phone: "+92 321 5550101", city: "Lahore", interest: "10 Marla villa", status: "New" },
      { id: "l2", name: "Sana Mirza", phone: "+92 333 5550202", city: "Karachi", interest: "2 bed apartment", status: "Follow-up" },
    ],
  });

  await prisma.rolePermission.createMany({ data: DEFAULT_GRANTS });

  await applyRestructure(prisma);
  console.log("Seed complete.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
