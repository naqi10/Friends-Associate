-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "short_description" TEXT NOT NULL DEFAULT '',
    "features" TEXT NOT NULL DEFAULT '',
    "starting_price" TEXT NOT NULL DEFAULT '',
    "estimated_duration" TEXT NOT NULL DEFAULT '',
    "image_path" TEXT NOT NULL DEFAULT '',
    "cta_text" TEXT NOT NULL DEFAULT '',
    "cta_url" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Service_division_published_sort_order_idx" ON "Service"("division", "published", "sort_order");

-- Start with the services that were previously fixed in code, so pages look the same after the upgrade.
INSERT INTO "Service" ("id", "division", "name", "icon", "features", "sort_order", "cta_url", "cta_text") VALUES
(gen_random_uuid()::text, 'architecture', 'Architecture & Engineering', '📐', 'House planning
2D floor plans
3D elevation
Architectural drawings
Structural drawings
Working drawings
Site planning', 10, '/contact#enquiry', 'Get a quotation'),
(gen_random_uuid()::text, 'architecture', 'Survey & Estimation', '💰', 'Soil investigation
Cost estimation & BOQ
Map printing', 20, '/contact#enquiry', 'Get a quotation'),
(gen_random_uuid()::text, 'architecture', 'NOC & Approval Consultancy', '📑', 'Petrol pump
LPG plant
Flour mill
Oil mill
Cotton factory / textile
Timber processing
Commercial projects
Industrial projects', 30, '/contact#enquiry', 'Get a quotation'),
(gen_random_uuid()::text, 'architecture', 'Industrial Project Planning', '🏭', 'Factories & sheds
Warehouse / godown
Cold storage
Workshops
Agricultural / farm buildings', 40, '/contact#enquiry', 'Get a quotation'),
(gen_random_uuid()::text, 'construction', 'Construction', '🏗️', 'Grey structure
Complete (turnkey) construction
Renovation
Reconstruction
Consultation', 10, '/contact#enquiry', 'Get a quotation'),
(gen_random_uuid()::text, 'construction', 'Waterproofing', '💧', 'Roof waterproofing
Water tank waterproofing
Basement waterproofing
Bathroom waterproofing
Foundation / DPC
Wall dampness treatment', 20, '/contact#enquiry', 'Get a quotation'),
(gen_random_uuid()::text, 'construction', 'Construction Chemicals', '🧪', 'DPC & damp proofing
Waterproofing chemicals
Concrete treatment
Water stopper
Termite protection
Joint treatment', 30, '/contact#enquiry', 'Get a quotation');
