-- Additive catalog + compatibility migration for GAP Marketplace Admin.
-- Approved architecture: vehicle reference catalog (VehicleBrand, VehicleModel)
-- and the PartCompatibility junction table (authoritative compatibility source).
-- Baseline migration 20260922134003_initial_entities is NOT modified.

-- CreateTable
CREATE TABLE "vehicle_brands" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_models" (
    "id" BIGSERIAL NOT NULL,
    "vehicle_brand_id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "production_status" TEXT NOT NULL CONSTRAINT "vehicle_models_production_status_check" CHECK ("production_status" IN ('current', 'discontinued', 'unknown')),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_compatibilities" (
    "part_id" BIGINT NOT NULL,
    "vehicle_model_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "part_compatibilities_pkey" PRIMARY KEY ("part_id","vehicle_model_id")
);

-- CreateIndex
CREATE INDEX "vehicle_brands_region_idx" ON "vehicle_brands"("region");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_brands_name_key" ON "vehicle_brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_models_vehicle_brand_id_name_key" ON "vehicle_models"("vehicle_brand_id", "name");

-- CreateIndex
CREATE INDEX "part_compatibilities_vehicle_model_id_idx" ON "part_compatibilities"("vehicle_model_id");

-- AddForeignKey
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_vehicle_brand_id_fkey" FOREIGN KEY ("vehicle_brand_id") REFERENCES "vehicle_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_compatibilities" ADD CONSTRAINT "part_compatibilities_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "part_compatibilities" ADD CONSTRAINT "part_compatibilities_vehicle_model_id_fkey" FOREIGN KEY ("vehicle_model_id") REFERENCES "vehicle_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- updated_at maintenance: keep updated_at in sync on every write (raw-SQL safety).
CREATE TRIGGER "vehicle_brands_set_updated_at"
BEFORE UPDATE ON "vehicle_brands"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "vehicle_models_set_updated_at"
BEFORE UPDATE ON "vehicle_models"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER "part_compatibilities_set_updated_at"
BEFORE UPDATE ON "part_compatibilities"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();