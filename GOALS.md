# GAP Marketplace Admin Goals

## Project Outcome

Build a lightweight internal administration application for managing individual car listings and individual car-part listings.

This is an internal CRUD tool, not a customer-facing marketplace.

## Approved Navigation

The application must follow these flows exactly:

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

Brands and models come from the shared GAP Marketplace vehicle catalog (`data/vehicle-catalog.json`), which is loaded into dedicated catalog tables (`vehicle_brands`, `vehicle_models`) by `prisma/seed.ts` (`pnpm db:seed`). They are navigation and filtering levels, not CRUD modules. The catalog tables are application reference data; the JSON is read only at seed time, never at runtime.

## Vehicle Catalog (Shared Reference Data)

A single JSON catalog is shared by the Cars and Car Parts modules:

- Location: `data/vehicle-catalog.json`
- Brands are grouped by region: American, European, Japanese.
- The brand allowlist is fixed at 54 approved brands (14 American, 27 European, 13 Japanese).
- Models are researched for every approved brand, covering current production models, discontinued models from approximately 1990 onward, and models relevant to international markets including the Philippines.
- Trims, engines, transmissions, and equipment variants are not separate models.
- Each model carries `production_status`: `current`, `discontinued`, or `unknown`.
- `production_status` is catalog metadata only (a column on `vehicle_models`). It is not a field added to Car or Parts.
- The catalog is stored in approved database tables (`vehicle_brands`, `vehicle_models`) seeded from the JSON; the JSON is never read at runtime.
- The isolated word "Automobiles" after BMW in the original pasted list is treated as branding, not a separate brand.
- Flagged and uncertain model entries (`unknown` status) remain in the catalog for GAP review.

UI behavior for the catalog:

- Brands are searchable.
- Models are searchable within a brand.
- Current models are shown first; discontinued and unknown models remain selectable.
- Car and parts listings can exist under discontinued models.
- Brand/model selection may be grouped by region as an optional visual organization aid, but region is never a required navigation step.
- No brand or model is hidden because it has no Car records.

## Approved Database Entities

Marketplace application entities:

- `Car`
- `Parts`
- `Media`

Approved reference-catalog and compatibility tables:

- `VehicleBrand` → `vehicle_brands`
- `VehicleModel` → `vehicle_models`
- `PartCompatibility` → `part_compatibilities`

All supplied marketplace fields are preserved without silently renaming, removing, or changing their meaning.

The only approved additional business field is nullable `Parts.oem_number`. Primary keys and creation/update timestamps are also approved.

`PartCompatibility` (composite key `(part_id, vehicle_model_id)`) is the authoritative source of a part's vehicle compatibility; the retained `Parts.compatibility` column is never written and is not authoritative. `Parts.images` is also retained only; its relationship to `Media` is resolved in the media phase.

No other business fields, entities, relationships, tables, or CRUD modules may be added without explicit approval.

## Cars Scope

The Cars module manages individual vehicle listings, not vehicle models.

The Add/Edit Car form must use the supplied Car fields:

- `seller_id`
- `title`
- `brand`
- `model`
- `year`
- `price`
- `original_price`
- `mileage_km`
- `body_style`
- `fuel_type`
- `transmission`
- `condition`
- `tag`
- `color`
- `vin`
- `description`
- `city`
- `location`
- `status`
- `rating`
- `inspection_score`
- `published_at`
- `sold_at`

The brand and model selected during navigation must be preselected in Add/Edit Car forms.

## Car Parts Scope

The Car Parts module manages individual part listings.

The Add/Edit Part form must use the supplied Parts fields:

- `title`
- `category`
- `brand`
- `part_number`
- `compatibility`
- `condition`
- `quantity`
- `price`
- `original_price`
- `tag`
- `free_shipping`
- `city`
- `location`
- `status`
- `images`
- `oem_number`

`Parts.brand` is the part manufacturer/brand. It is not the selected vehicle brand.

The selected navigation brand and model must be recorded as the part's compatibility through the approved `PartCompatibility` junction table, the authoritative compatibility source; the retained `Parts.compatibility` column is never written. The application must not invent compatibility data or claim unverified fitment.

Parts categories are predefined allowed values for `Parts.category`:

- `engine`
- `transmission`
- `suspension`
- `brakes`
- `exhaust`
- `electrical`
- `tires_wheels`
- `wheels`
- `body_exterior`
- `interior`
- `fluids_lubricants`
- `accessories`
- `other`

Part conditions are predefined allowed values for `Parts.condition`:

- `new`
- `used`
- `refurbished`

Categories and conditions appear as form options and filters. They are not entities, tables, or standalone CRUD modules.

## Media Scope

Preserve the supplied Media fields:

- `mediable_type`
- `mediable_id`
- `url`
- `type`
- `is_primary`
- `order`
- `caption`
- `file_path`
- `file_name`
- `mime_type`
- `size_bytes`

The target behavior is multiple images per car or part, image ordering, and one primary image per listing. The existing relationship between `Parts.images` and `Media` must be confirmed before implementation.

Uploads must use a server-side storage abstraction configured through `UPLOAD_DIR`:

```dotenv
UPLOAD_DIR=./storage/uploads
```

Production may use an EFS mount such as `/mnt/efs/uploads` only after deployment and mount details are confirmed. Credentials remain server-side, filenames must be sanitized or generated, file type and size must be validated, and arbitrary filesystem paths must never be exposed.

## Approved Technology

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- pnpm
- React Hook Form and Zod where appropriate
- TanStack Table for listing management
- PostgreSQL and Prisma remain proposed defaults pending confirmation of existing GAP infrastructure and exact schema inputs

## User Experience Outcomes

- Clear main navigation between Cars and Car Parts
- Breadcrumbs showing the current module, existing brand, and existing model
- Search and useful listing filters
- Responsive listing tables
- Forms grouped into logical sections
- Image upload and preview after media semantics are confirmed
- Empty, loading, success, and error states
- Confirmation before destructive actions
- A clean, modern, consistent interface focused on CRUD usability

## Non-Goals

- Customer marketplace browsing
- Checkout or payment processing
- Chat
- Seller payouts
- Analytics dashboards
- Brand CRUD
- Model CRUD
- Category CRUD
- Condition CRUD
- Manufacturer CRUD
- Standalone brand/model/compatibility CRUD modules (catalog and junction tables are reference/technical data, not CRUD modules)
- Authentication or seller entities in the GAP Marketplace data model
- AWS deployment or live resource changes without separate approval

## Acceptance Criteria

- Only Car, Parts, and Media are marketplace application entities; the approved catalog tables (`vehicle_brands`, `vehicle_models`) and compatibility junction (`part_compatibilities`) are reference/technical tables.
- Both modules use the same shared vehicle catalog for brand and model navigation.
- The catalog contains only the 54 approved brands in their approved regional groupings.
- Models are researched per the catalog scope; unknown or uncertain entries are flagged `unknown` for review.
- Brand/model navigation never derives options from Car listing data.
- Car forms preserve all supplied Car fields and preselect the navigated brand/model.
- Parts forms preserve all supplied Parts fields, including `images` and nullable `oem_number`.
- The selected vehicle brand/model is represented through the existing `Parts.compatibility` format once supplied.
- `Parts.brand` remains the part manufacturer/brand and is never overwritten with the selected vehicle brand.
- Categories and conditions use the exact supplied values as dropdowns and filters.
- Brands and models are searchable; current models appear first; discontinued models stay selectable.
- Region grouping is optional UI organization only.
- Media and uploads follow the confirmed existing formats and relationships.
- The interface is responsive and provides appropriate loading, empty, success, error, and confirmation states.
- No pending data format is invented to unblock implementation.

## Pending Inputs

Implementation that depends on these items is blocked until they are supplied and approved:

- Exact database type, nullability, default, and existing relationship for every supplied field
- Existing `Parts.images` format and representative values
- Existing relationship and ownership rules between `Parts.images` and `Media`
- GAP review of model entries in `data/vehicle-catalog.json` flagged `unknown`
