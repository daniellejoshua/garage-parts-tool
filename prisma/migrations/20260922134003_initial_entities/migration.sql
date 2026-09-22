-- Initial schema for GAP Marketplace Admin.
-- Approved Phase 2 proposal (review only — not yet applied to any database).
-- Only the three supplied entities are modeled: Car, Parts, Media.
-- No foreign keys, no additional entities, no invented relationships.
-- Parts.compatibility and Parts.images are provisional nullable text columns;
-- their internal formats are uninterpreted and will be revisited when supplied.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "cars" (
    "id" BIGSERIAL NOT NULL,
    "seller_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "original_price" DECIMAL(12,2),
    "mileage_km" INTEGER NOT NULL,
    "body_style" TEXT,
    "fuel_type" TEXT,
    "transmission" TEXT,
    "condition" TEXT,
    "tag" TEXT,
    "color" TEXT,
    "vin" TEXT,
    "description" TEXT,
    "city" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL,
    "rating" DECIMAL(3,1),
    "inspection_score" INTEGER,
    "published_at" TIMESTAMPTZ(6),
    "sold_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "id" BIGSERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL CONSTRAINT "parts_category_check" CHECK ("category" IN ('engine', 'transmission', 'suspension', 'brakes', 'exhaust', 'electrical', 'tires_wheels', 'wheels', 'body_exterior', 'interior', 'fluids_lubricants', 'accessories', 'other')),
    "brand" TEXT NOT NULL,
    "part_number" TEXT,
    "compatibility" TEXT,
    "condition" TEXT NOT NULL CONSTRAINT "parts_condition_check" CHECK ("condition" IN ('new', 'used', 'refurbished')),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(12,2) NOT NULL,
    "original_price" DECIMAL(12,2),
    "tag" TEXT,
    "free_shipping" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL,
    "images" TEXT,
    "oem_number" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" BIGSERIAL NOT NULL,
    "mediable_type" TEXT NOT NULL,
    "mediable_id" BIGINT NOT NULL,
    "url" TEXT,
    "type" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "file_path" TEXT,
    "file_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cars_brand_model_idx" ON "cars"("brand", "model");

-- CreateIndex
CREATE INDEX "parts_category_idx" ON "parts"("category");

-- CreateIndex
CREATE INDEX "media_mediable_type_mediable_id_idx" ON "media"("mediable_type", "mediable_id");

-- updated_at maintenance: keep updated_at in sync on every write, not just at insert.
-- Prisma's @updatedAt covers ORM writes; these triggers also cover raw SQL writes.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "cars_set_updated_at"
BEFORE UPDATE ON "cars"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "parts_set_updated_at"
BEFORE UPDATE ON "parts"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "media_set_updated_at"
BEFORE UPDATE ON "media"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();