# Nutrition Planning Implementation Plan (v1)

This document turns the nutrition architecture into an implementation-ready v1 plan for Resolute Society.

## 1) v1 Goal

Deliver a reliable planning workflow that answers:
- Given a candidate per-person daily ration, how well does it cover the society's aggregate nutrient requirements?
- Which nutrients are under target, near target, or potentially excessive?

v1 priority is correctness, traceability, and clear gap analysis.

## 2) Scope And Non-Goals

In scope for v1:
- Canonical food nutrient dataset (raw/dry per 100 g where applicable)
- Requirement profiles by age bracket and sex
- Society-level requirement aggregation
- Scenario planning with ration inputs (grams per person per day)
- Coverage and status outputs by nutrient
- Configurable nutrient reserve factors for conservative planning targets

Not in scope for v1:
- Full agronomy or seed-lot planning (tracked separately)
- Individual medical advice
- Optimization solver (least-cost or land-constrained optimization)

## 3) Data Model (Proposed)

Use nutrition-prefixed tables to keep domain boundaries explicit.

### 3.1 Reference Tables

1. nutrition_nutrient
- id (TEXT PK)
- code (TEXT UNIQUE) examples: kcal, protein_g, iron_mg, vitamin_c_mg
- name (TEXT)
- unit (TEXT)
- category (TEXT) macros/micros
- sort_order (INTEGER)

2. nutrition_food_item
- id (TEXT PK)
- code (TEXT UNIQUE)
- common_name (TEXT)
- scientific_name (TEXT NULL)
- food_group (TEXT)
- edible_fraction (REAL)
- basis_state (TEXT CHECK raw_dry/cooked/prepared)
- source_system (TEXT)
- source_ref (TEXT) example USDA FDC ID
- source_version (TEXT)
- source_date (TEXT)
- created_at (TEXT)

3. nutrition_food_nutrient
- food_item_id (TEXT FK)
- nutrient_id (TEXT FK)
- amount_per_100g (REAL)
- confidence (TEXT NULL)
- is_missing (INTEGER default 0)
- PRIMARY KEY (food_item_id, nutrient_id)

### 3.2 Requirement Tables

4. nutrition_requirement_profile
- id (TEXT PK)
- profile_code (TEXT UNIQUE)
- age_min_years (REAL)
- age_max_years (REAL NULL)
- sex (TEXT CHECK male/female/unspecified)
- source_system (TEXT)
- source_ref (TEXT)
- source_version (TEXT)

5. nutrition_requirement_value
- profile_id (TEXT FK)
- nutrient_id (TEXT FK)
- target_rda_ai (REAL NULL)
- ear (REAL NULL)
- ul (REAL NULL)
- PRIMARY KEY (profile_id, nutrient_id)

### 3.3 Planning Tables

6. nutrition_plan
- id (TEXT PK)
- society_id (TEXT FK society_config.id)
- name (TEXT)
- model_version (TEXT)
- notes (TEXT)
- created_by (TEXT FK person.id)
- created_at (TEXT)

7. nutrition_plan_item
- plan_id (TEXT FK)
- food_item_id (TEXT FK)
- grams_per_person_per_day (REAL)
- PRIMARY KEY (plan_id, food_item_id)

8. nutrition_plan_result
- plan_id (TEXT FK)
- nutrient_id (TEXT FK)
- total_intake_per_person (REAL)
- aggregate_target (REAL)
- coverage_pct (REAL)
- ear_pct (REAL NULL)
- ul_pct (REAL NULL)
- status (TEXT)
- PRIMARY KEY (plan_id, nutrient_id)

Optional cache table; can be computed on demand at first.

### 3.4 Demographic Aggregation Inputs

Current schema includes DOB for people and dependants but does not currently store all demographic attributes needed for full individual requirement assignment.

To avoid blocking v1, add one of these approaches:

Option A (recommended for v1):
- nutrition_society_cohort
  - society_id
  - profile_id
  - count
  - as_of_date
  - source_mode (manual/derived)

Option B (later):
- Add person-level demographic attributes and derive cohorts automatically.

### 3.5 Planning Reserve Factors

Add configurable safety margins so plans target deliberate surplus without collecting pregnancy/lactation data.

9. nutrition_reserve_factor
- nutrient_id (TEXT FK)
- multiplier (REAL NOT NULL CHECK multiplier >= 1)
- rationale (TEXT)
- version (TEXT)
- PRIMARY KEY (nutrient_id, version)

Suggested v1 defaults:
- energy and protein: 1.15
- vitamin C, folate, iron, zinc: 1.20
- other tracked nutrients: 1.15

## 4) Core Calculation Pipeline

For a selected plan and as-of date:

1. Resolve cohort counts:
- Use nutrition_society_cohort rows or derived profile counts.

2. Compute aggregate requirements:
- For each nutrient, sum count * target_rda_ai across cohorts.
- Also compute aggregate EAR and UL where available.

2a. Apply planning reserve factors:
- planning_target = aggregate_requirement * reserve_multiplier

3. Compute ration nutrient totals per person:
- For each plan item and nutrient:
  - contribution = grams_per_person_per_day / 100 * amount_per_100g
- Sum contributions by nutrient.

4. Convert to aggregate intake:
- aggregate_intake = per_person_intake * total_population_count

5. Compute coverage metrics:
- coverage_pct = aggregate_intake / planning_target * 100
- ear_pct and ul_pct analogously when available.

6. Classify status:
- Critical low: < 70%
- Low: 70% to < 90%
- Adequate: 90% to 120%
- High: > 120% and <= UL or no UL
- Potential excess: > UL when UL exists

7. Persist or return result set for UI.

## 5) API / Service Layer Design

Create a nutrition service module under server domain:
- computeAggregateRequirements(societyId, asOfDate)
- evaluatePlanCoverage(planId, asOfDate)
- upsertPlanItems(planId, items)

Repository modules:
- nutrition-reference.repository.ts
- nutrition-requirement.repository.ts
- nutrition-plan.repository.ts
- nutrition-cohort.repository.ts

## 6) UI v1 Flow

1. Select society and as-of date.
2. Enter or load cohort distribution.
3. Review or accept default reserve-factor profile.
4. Build ration plan with food items + grams/day/person.
5. Run analysis.
6. Display nutrient table with:
- intake
- baseline target
- planning target (with reserve)
- coverage %
- status
- notes for missing-data contributions

7. Show top 5 deficits and top 3 excesses first.

## 7) Data Seeding Plan

Seed packs in this order:

1. Nutrients pack:
- canonical nutrient rows and units

2. Food pack:
- 60 to 80 core foods from USDA references

3. Requirement pack:
- DRI-based profile and nutrient values

4. Scenario pack (examples):
- 3 baseline ration scenarios for regression tests

Each seed row should include source metadata and model version.

## 8) Validation Strategy

Minimum automated checks:

1. Unit conversion tests
- Ensure imported source units normalize to canonical units correctly.

2. Deterministic fixture tests
- Fixed plan and cohorts should produce exactly expected results.

3. Threshold-edge tests
- 69.99, 70.00, 89.99, 90.00, 120.00 boundaries classify correctly.

4. Missing-data propagation tests
- Unknown nutrient values do not silently become zero.

5. Sanity bounds checks
- Reject negative grams and implausible outlier inputs.

## 9) Rollout Phases

Phase 1: Core reference and requirement data
- Add schema tables and seed scripts.

Phase 2: Plan evaluation engine
- Implement computation services and result output.

Phase 3: Planning UI
- Add ration editor and nutrient coverage table.

Phase 4: Cohort UX hardening
- Improve demographic input/derivation flow.

Phase 5: Bridge prep
- Add interfaces for later crop-to-food mapping integration.

## 10) Acceptance Criteria (v1)

v1 is complete when:
- A user can create a ration plan in grams/person/day.
- The system computes aggregate nutrient coverage for a society cohort snapshot.
- Results include status bands and identify major deficits/excesses.
- All outputs are source-traceable and reproducible by model version.

## 11) Key Risks And Mitigations

Risk: demographic detail is incomplete for full individual-level requirement modeling.
Mitigation: explicit cohort table by age/sex plus nutrient reserve factors for conservative surplus planning.

Risk: missing micronutrient values in some foods.
Mitigation: unknown flags and confidence indicators in UI.

Risk: false precision in early datasets.
Mitigation: source metadata, versioning, and conservative defaults.
