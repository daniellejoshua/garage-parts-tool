# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are internal staff preparing presentation and dummy marketplace data. They create representative car and part listings for seeding rather than acting as production marketplace sellers.

## Product Purpose

GAP Marketplace Admin is a controlled authoring tool for creating car and compatible-part listings that can be exported as JSON and used to seed the real marketplace quickly for presentations. Success means staff can prepare realistic listing sets quickly and accurately without weakening the marketplace's data rules.

## Positioning

Unlike the seller-facing marketplace, this tool organizes seed-listing creation around the approved shared vehicle catalog and produces portable presentation data for the real system.

## Operating Context

Staff repeatedly navigate from Cars or Car Parts through an existing vehicle brand and model, then create and maintain individual listings in that context. The work prioritizes speed and accuracy and culminates in data that can be transferred to the real marketplace for presentation use.

## Capabilities and Constraints

- Cars and Car Parts are the two primary listing workflows.
- Vehicle brands and models come from the shared read-only reference catalog and are navigation and filtering values, not CRUD modules.
- Car forms inherit the navigated brand and model.
- Part compatibility is recorded through the approved compatibility junction; a part's brand remains its manufacturer.
- The application preserves the approved entities, fields, value sets, and media rules documented in `GOALS.md` and `AGENTS.md`.
- The tool supports creating, reviewing, editing, and deleting seed listings and exporting them as JSON for presentation seeding.
- The application must not fabricate schema formats, compatibility claims, credentials, or unsupported business data.

## Brand Commitments

Preserve the name GAP Marketplace Admin and use only real assets available in the repository. No current visual treatment is binding, and future work must not invent brand claims or identity assets.

Use familiar category-standard admin conventions executed with Linear-level precision and restraint. Do not introduce a themed visual metaphor merely to make the product distinctive.

## Evidence on Hand

- Product scope and approved workflows: `GOALS.md`
- Architecture, delivery status, and implementation constraints: `PLANS.md`
- Shared vehicle catalog: `data/vehicle-catalog.json`
- Approved vehicle-brand marks and their licensing notes: `public/brand-logos/`
- No testimonials, customer claims, performance benchmarks, or separate GAP identity assets are supplied.

## Product Principles

- Optimize repeated seed-data work for speed and accuracy.
- Keep vehicle context visible throughout listing creation and review.
- Make data state and export readiness easy to verify before transfer.
- Preserve marketplace data boundaries rather than inventing convenient shortcuts.
- Keep the interface operational and focused instead of presenting decorative analytics.
