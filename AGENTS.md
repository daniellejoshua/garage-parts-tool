# Repository Guidance

## Scope

This repository contains GAP Marketplace Admin, an internal CRUD application for individual Car and Parts listings.

Read `GOALS.md` and `PLANS.md` before making changes. Work on one explicitly approved phase at a time and stop before starting the next phase.

## Hard Data Boundaries

- The marketplace application entities are `Car`, `Parts`, and `Media`. Approved reference/compatibility tables: `vehicle_brands`, `vehicle_models`, `part_compatibilities`.
- `PartCompatibility` (composite key `(part_id, vehicle_model_id)`) is the authoritative vehicle-compatibility source; the retained `Parts.compatibility` column is never written.
- Do not add further entities, tables, business fields, relationships, or CRUD modules without explicit approval.
- Nullable `Parts.oem_number` is the only approved additional business field.
- Primary keys and creation/update timestamps are approved technical additions; their types remain pending.
- Preserve every supplied field name and meaning, including `Parts.compatibility` and `Parts.images`.
- Do not create Manufacturer, Category, Condition, User, Seller, or authentication entities; the catalog tables are reference data, not CRUD modules.
- Do not fabricate records, OEM numbers, compatibility, credentials, or schema formats.

## Navigation

Implement these flows exactly:

```text
Cars
→ Vehicle Brand
→ Vehicle Model
→ Whole Car Listings CRUD

Car Parts
→ Vehicle Brand
→ Vehicle Model
→ Compatible Parts Listings CRUD
```

Brands and models come from the shared catalog at `data/vehicle-catalog.json`. They are navigation/filtering values, not entities. Never derive them from Car listings.

Car forms must preselect the navigated brand/model. Parts forms must record the navigated vehicle through the approved `PartCompatibility` junction (never into the retained `Parts.compatibility` column). `Parts.brand` always remains the part manufacturer/brand.

## Vehicle Catalog Rules

`data/vehicle-catalog.json` is shared, read-only application reference data for both modules.

- Only the 54 approved brands, in their approved regional groups (American, European, Japanese). Do not add brands.
- Do not treat the isolated word "Automobiles" (after BMW) as a brand.
- Models cover current production, discontinued models from roughly 1990 onward, and international markets including the Philippines.
- Trims, engines, transmissions, and equipment variants are not separate models.
- `production_status` is limited to `current`, `discontinued`, or `unknown` (enforced by a CHECK constraint on `vehicle_models.production_status`). Do not guess; mark uncertain entries `unknown` for GAP review.
- Production status is catalog metadata only. Never add it to the Car or Parts entities.
- Region grouping is optional UI organization; it is never a required navigation step.
- Brands and models are searchable. Current models show first; discontinued and unknown models remain selectable and may host listings.
- Do not hide a brand or model because it has no Car records.
- Runtime navigation reads the approved tables `vehicle_brands` and `vehicle_models` ordered by id (file order) via `loadDatabaseCatalog()` (`src/lib/reference/catalog-db.ts`). The JSON is read only at seed time by `prisma/seed.ts` (`pnpm db:seed`, idempotent: upserts by name / brand+name, IDs preserved, never deletes rows — missing entries are reported). Seed with `pnpm db:seed`; apply migrations with `prisma migrate deploy`. There is no JSON fallback at runtime.

## Parts Values

Categories and conditions are field values, not entities or CRUD modules.

Use only the approved category values:

```text
engine, transmission, suspension, brakes, exhaust, electrical,
tires_wheels, wheels, body_exterior, interior, fluids_lubricants,
accessories, other
```

Use only the approved condition values:

```text
new, used, refurbished
```

## Technology

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- pnpm
- TanStack Table for listing tables
- React Hook Form and Zod where appropriate
- PostgreSQL and Prisma only after database approval

Use shadcn/ui as the default component library. Prefer Sidebar, Breadcrumb, Card, Table, form controls, Dialog/AlertDialog, Sheet, Badge, Tabs, Skeleton, and Sonner where they serve an approved requirement. Avoid unnecessary dependencies, custom replacements, and visual complexity.

Keep the UI clean, modern, responsive, consistent, and focused on CRUD usability.

## Server And Storage

- Use Next.js server-side capabilities; do not add a separate backend service.
- Keep database, EFS, and other credentials server-side.
- Use `UPLOAD_DIR` for uploads after media implementation is approved.
- Never expose arbitrary filesystem paths or accept unsanitized filenames.
- Do not assume EFS is mounted or alter AWS resources without approval.
- Do not define how `Parts.images` and `Media` coexist until the existing relationship is supplied.

## Pending Inputs

Do not guess any of the following:

- Exact database field types, nullability, defaults, or relationships
- `Parts.images` format
- Relationship between `Parts.images` and `Media`

Document a blocker and request approval if implementation cannot proceed without one of these inputs.

## Working Rules

- Preserve existing conventions and unrelated work.
- Make the smallest correct change for the approved phase.
- Before database work, present the exact field-by-field schema and migration for approval.
- Never run destructive migrations, commit, push, deploy, or change live resources without explicit approval.
- Run relevant lint, typecheck, test, and build checks for implemented work.
- Report completed work, check results, pending inputs, and remaining issues at the end of each phase.