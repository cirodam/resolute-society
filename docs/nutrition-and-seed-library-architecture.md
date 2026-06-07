# Nutrition And Seed Library Architecture (v1)

This project should treat nutrition planning and seed-library horticulture as two related but distinct systems.

## Why Separate Them

They answer different questions:
- Nutrition system: Are people nutritionally covered?
- Seed library system: What can we realistically grow, save, and propagate here?

If these are merged into one model too early, both become harder to maintain and reason about.

## System A: Nutrition Planning Domain

Purpose:
- Convert food quantities into nutrient totals and coverage against demographic requirements.

Core entities:
- nutrient
- food_item
- food_nutrient_profile
- nutritional_requirement_profile
- plan_ration_item
- plan_nutrient_coverage

Primary outputs:
- nutrient adequacy percentages
- deficiency and excess risk flags
- scenario comparison (diet A vs diet B)

Data authority:
- DRI requirement standards
- USDA composition data

## System B: Agriculture / Horticulture Seed Library Domain

Purpose:
- Track crop species/varieties, seed access, propagation constraints, seasonality, and expected production characteristics.

Core entities:
- crop_taxon (optional genus/species/cultivar metadata)
- crop_profile (practical planning unit)
- region_profile
- crop_region_feasibility
- seed_lot
- germination_test
- planting_window
- expected_yield_profile
- storage_profile

Primary outputs:
- feasible crop set for selected region and constraints
- seed sufficiency and replacement risk
- production potential estimates by season/year

Data authority:
- extension/agronomy references and local records
- internal observed yields and germination outcomes

## Bridge Layer: Food-Crop Mapping

Use an explicit bridge so the domains stay decoupled.

Bridge entities:
- crop_food_mapping
- processing_path

Bridge responsibilities:
1. Map one or more crops to one edible food form used by nutrition math.
2. Apply edible fraction and processing yields (for example dry bean seed to cooked edible bean).
3. Express uncertainty where processing assumptions are weak.

Rules:
- Nutrition calculations only consume normalized food quantities.
- Agronomy calculations only consume crop/seed feasibility and production data.
- Bridge transforms production outputs into food inputs for nutrition planning.

## Recommended Planning Flow

1. Build candidate crop plan in seed-library domain.
2. Estimate harvest quantities by crop and region constraints.
3. Convert harvest to edible food quantities through bridge mappings.
4. Run nutrition coverage and gap analysis.
5. Iterate crop plan until both feasibility and nutrient coverage are acceptable.

## v1 Boundaries

Keep v1 intentionally small:
- Nutrition domain can run with seed data even before seed-lot tracking exists.
- Seed-library domain can run with coarse region profiles before precise geospatial zoning exists.
- Bridge can start with conservative default conversion factors and improve over time.

## Taxonomy Guidance

Taxonomy should be supported but not required at full detail in v1.

Policy:
- Required: practical crop profile used in planning.
- Optional: genus/species/cultivar fields.
- Mandatory species/cultivar split only when it materially changes yield, storage, climate fit, or nutrient-relevant food output.

## Versioning And Reproducibility

All three layers need versioned assumptions:
- nutrition model version
- agronomy model version
- bridge conversion version

Historical plans should store these versions so prior results remain reproducible.

## Detailed v1 Build Plan

Use [nutrition-v1-implementation-plan.md](nutrition-v1-implementation-plan.md) as the implementation-ready roadmap for the nutrition domain.
