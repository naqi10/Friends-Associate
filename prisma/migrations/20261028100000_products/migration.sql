-- Construction chemicals & building materials catalog (Website → /products).
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "options" TEXT NOT NULL DEFAULT '',
    "price_pkr" INTEGER,
    "benefits" TEXT NOT NULL DEFAULT '',
    "specs" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "image_path" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_published_category_sort_order_idx" ON "Product"("published", "category", "sort_order");

-- Same as every table: lock Supabase's public REST API out (see 20261020180000_enable_row_level_security).
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

-- The nine products from the Friends Associates Product Catalog & Rate List. Only what the catalog states;
-- details it does not give are left out until confirmed. Editable in Admin → Products.
INSERT INTO "Product" ("id", "slug", "name", "category", "brand", "summary", "options", "price_pkr", "benefits", "specs", "note", "sort_order") VALUES
(gen_random_uuid()::text, 'concrete-spacer', 'Concrete Spacer', 'accessories', '',
 'Used in RCC slab, beam, column and foundation to give reinforcement steel the required concrete cover.',
 ' | 16 | per piece', 16,
 'Keeps steel from touching the shuttering directly
Maintains proper concrete cover',
 'Centre hole for fixing on the steel', '', 10),
(gen_random_uuid()::text, 'anti-termite-bsf-140', 'Anti-Termite Chemical – Brick Stone Focus BSF-140', 'termite', 'Brick Stone',
 'Anti-termite treatment for construction and wood / furniture. For offices, houses, shops, warehouses and commercial spaces.',
 '250 ml | 2999 | per bottle', 2999,
 'Protection against termites
Part of a long-lasting treatment system',
 'Special termite killer liquid, model BSF-140
Coverage: 150–200 sq ft per litre',
 'Always apply as per the product label / manufacturer instructions.', 20),
(gen_random_uuid()::text, 'high-seal-waterproofing-kit', 'Double Component Waterproofing Kit – Brick Stone High Seal', 'waterproofing', 'Brick Stone',
 'Seepage and leakage protection in roofs, water tanks, basements, bathrooms, foundations and walls.',
 ' | 4100 | per kit', 4100,
 'Protects from seepage, dampness and leakage
Strong and durable
Easy application
Suitable for interior and exterior use',
 'Type: 2-component cementitious waterproofing coating (powder + liquid)
Coverage: 50–60 sq ft per kit, in 2 coats
Application: brush, roller or spray',
 '', 30),
(gen_random_uuid()::text, 'rock-grip-dpc-membrane', 'DPC Membrane – Rock Grip', 'waterproofing', 'Rock Grip',
 'Blocks rising dampness and moisture at DPC level of walls and foundation.',
 '4 inch | 2500 | per roll
9 inch | 3800 | per roll
13 inch | 4800 | per roll', 2500,
 'Stops seepage and dampness in walls
Protects walls and paint from salinity damage
Improves strength of foundation and roof',
 'Roll widths: 4, 9 and 13 inch
Rock Grip membrane sheet',
 '', 40),
(gen_random_uuid()::text, 'sbr-bonding-agent', 'SBR Bonding Agent – Brick Stone', 'concrete_repair', 'Brick Stone',
 'Concrete repair, plaster repair, damaged surface repair and bonding of old and new concrete.',
 '5 litre | 3000 | per can', 3000,
 'Improves bonding strength
Enhances adhesion and durability of repair mortar / concrete
High strength bond
Water and chemical resistant',
 'Type: Styrene Butadiene Rubber (SBR) liquid bonding agent
Pack size: 5 litre',
 '', 50),
(gen_random_uuid()::text, 'xps-jablon-sheet', 'XPS Jablon Sheet – Heatproofing', 'heatproofing', 'Rock Grip / Rockline',
 'Thermal insulation and heatproofing for roofs, walls and ceilings.',
 '25 mm | 60 | per sq ft
38 mm | 75 | per sq ft
50 mm | 93 | per sq ft', 60,
 'Excellent heat resistance
Helps keep indoor temperature down and saves energy
Light weight and moisture resistant
Long-lasting durability',
 'Thicknesses: 25, 38 and 50 mm',
 'Prices are without bilty (transport not included).', 60),
(gen_random_uuid()::text, 'bitu-prima-primer', 'Bitu-Prima – Cold Applied Bituminous Emulsion Primer', 'waterproofing', 'Brick Stone',
 'Primer applied before a waterproofing membrane or coating on roof, foundation and basement surfaces.',
 '13 kg | 2800 | per pack', 2800,
 'Excellent adhesion to the waterproofing layer
Moisture barrier
Quick drying
Cold applied: no heating required
Improves durability',
 'Type: cold applied bituminous emulsion primer
Uses: roofs, foundations, basements, bridges and structures
Pack size: 13 kg',
 '', 70),
(gen_random_uuid()::text, 'pvc-water-stopper', 'PVC Water Stopper', 'waterproofing', '',
 'Stops water leakage in construction joints, foundation joints, basement walls, water tanks / reservoirs and expansion joints.',
 ' | 280 | per running ft', 280,
 '100% water tight
High flexibility
Chemical and corrosion resistant
Easy to install: cut and fix at site
Long-lasting, UV resistant',
 'Types: Centre Bulb, Flat and External
Colours: black and yellow',
 '', 80),
(gen_random_uuid()::text, 'epoxy-hardener-pack', 'Epoxy + Hardener Pack', 'concrete_repair', '',
 'Fixing new steel / dowels in existing concrete, crack and joint repair, water tank repair, tile and stone bonding.',
 '500 g + 15 g | 2500 | per pack', 2500,
 'Strong adhesion and bonding for durable repair
Useful for concrete, crack and joint repair and steel anchoring',
 'Pack: 2 × 250 g epoxy + 1 × 15 g hardener',
 'Mixing ratio, coverage and safety: follow the product label.', 90)
ON CONFLICT ("slug") DO NOTHING;
