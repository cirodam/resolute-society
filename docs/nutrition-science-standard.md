# Nutrition Science Standard (v1)

This document defines the minimum scientific standard for nutrition planning features.

Goal: ensure planning outputs are reproducible, auditable, and based on recognized public-health references rather than ad-hoc assumptions.

## 1) Authoritative Sources

Use these sources in this order:

1. Requirement reference values:
- U.S. National Academies Dietary Reference Intakes (DRIs): RDA, AI, EAR, and UL by age and sex.
- Pregnancy and lactation DRIs remain part of reference science but are used through contingency buffers in v1 unless explicit cohort tracking is enabled.

2. Food composition values:
- USDA FoodData Central (FDC), per 100 g edible portion.

3. Preparation adjustments:
- USDA nutrient retention factors and USDA yield/cooking conversion factors.

4. Energy equations (if dynamic calorie targets are enabled):
- DRI/EER equations with physical activity level (PAL) category.

If a required value does not exist in source (1), use WHO/FAO references and record provenance.

## 2) Canonical Units And Representations

Canonical storage unit:
- food quantity basis: grams (g)
- nutrient basis: per 100 g edible raw/dry item where applicable

Micronutrient units:
- vitamin A: mcg RAE
- vitamin C: mg
- vitamin D: mcg
- vitamin B12: mcg
- folate: mcg DFE
- thiamine: mg
- calcium: mg
- iron: mg
- zinc: mg
- magnesium: mg

Macronutrient units:
- energy: kcal
- protein: g
- fat: g
- carbohydrate: g
- fiber: g

All imports must normalize source units into these canonical units.

## 3) Food Data Policy

For each food row, keep:
- source system (for example, USDA FDC)
- source identifier (for example, FDC ID)
- source version/date
- edible fraction
- preparation state flag (raw/dry canonical, cooked/prepared optional)

v1 defaults:
- canonical planning runs on raw/dry values for storage realism
- optional cooked views derive from retention + yield profiles

Do not mix dry and cooked rows in one calculation pass unless explicit conversion is applied.

## 4) Requirement Model Policy

Minimum demographic dimensions:
- age bracket
- sex

v1 operational policy:
- The system does not require person-level pregnancy or lactation status capture.
- Societies should plan above baseline requirements using contingency reserve factors.

Use this logic:
1. Select base requirement profile by age + sex.
2. Sum across all members/dependents to produce society daily requirement.
3. Apply configurable nutrient reserve factors to generate planning targets.

For each nutrient, store:
- rda_or_ai (target)
- ear (if available)
- ul (if available)
- source citation fields

Interpretation for planning:
- adequacy target: compare intake vs RDA/AI
- deficiency-risk signal: compare intake vs EAR when available
- excess-risk signal: compare intake vs UL when available

Default nutrient reserve factors for v1 planning targets:
- energy and protein: 1.15x baseline
- vitamin C and folate: 1.20x baseline
- iron and zinc: 1.20x baseline
- all other tracked nutrients: 1.15x baseline

These are planning safety margins, not clinical recommendations.

## 5) Risk Thresholds For UI (v1)

Coverage percent = intake / target.

Default status bands:
- Critical low: < 70%
- Low: 70% to < 90%
- Adequate: 90% to 120%
- High: > 120% and <= UL-normalized safe range
- Potential excess: above UL (when UL exists)

Energy and protein can use stricter alerts if configured:
- Energy crisis alert: < 90% of target
- Protein serious shortfall: < 80% of target

Status labels are decision-support indicators, not medical diagnosis.

## 6) Scientific Guardrails

1. Bioavailability caveat:
- Iron and zinc absorption varies by diet pattern.
- v1 should display a warning that plant-heavy diets may require higher nominal intake.

2. Data uncertainty:
- Show source and last-updated metadata in the UI/export.
- Treat missing micronutrient values as unknown, not zero.

3. Population caveat:
- Group-level adequacy does not guarantee every individual is covered.
- Keep optional per-person drilldown in roadmap.

4. Medical caveat:
- This tool supports planning, not diagnosis or treatment.

## 7) Validation And QA Requirements

Before release, validate with test scenarios:

1. Unit normalization tests:
- imported food values convert exactly into canonical units

2. Deterministic calculation tests:
- same inputs always produce same totals and coverage percentages

3. Requirement aggregation tests:
- mixed demographic sample yields expected summed targets

4. Gap classification tests:
- nutrient status boundaries classify correctly at threshold edges

5. Regression fixtures:
- at least 3 known meal plans with frozen expected outputs

## 8) Minimum Dataset Expectations (v1)

Seed data target:
- 60 to 80 practical foods spanning staples, legumes, roots, brassicas, alliums, fruits, eggs/dairy/meat/fats

Nutrient set required in v1:
- kcal, protein, fat, carbohydrate, fiber
- vitamin A, C, D, B12, folate, thiamine
- calcium, iron, zinc, magnesium

If a nutrient is unavailable for a food, store null and propagate an "unknown contribution" flag.

## 9) North America Community-Scale Growability Standard (v1)

Nutrition coverage must be paired with regional production feasibility.

For each seeded food, include growability metadata for North America community-scale planning:
- climate suitability bands (for example USDA hardiness zones or frost-free day ranges)
- expected yield range (kg per hectare, low/median/high)
- planting and harvest windows by region band
- storage life class (short/medium/long with typical month range)
- input intensity class (low/medium/high for irrigation, fertility, and pest pressure)
- mechanization dependency class (hand-scale feasible, mixed, machine-preferred)
- seed sovereignty status (open-pollinated/seed-saving friendly, hybrid-dependent, perennial stock)
- processing dependency (none/basic/advanced, where advanced means not practical for most communities)

v1 planning rule:
- a food can contribute to "local production coverage" only if it is marked feasible for the selected region profile and production model

Recommended region profiles for v1 defaults:
- cool/short-season
- temperate/humid
- hot/humid
- semi-arid/irrigated
- mediterranean

Use these profiles to avoid false precision before full geospatial modeling exists.

### 9.1) Core Crop Priority Groups

To keep plans realistic, prioritize foods that are commonly grown or raised at community scale in North America:

1. Calorie staples:
- potato, sweet potato, winter squash, dry corn, wheat, oats

2. Protein and mineral staples:
- dry beans, lentils, peas, soybeans (where climate allows)

3. Nutrient-dense vegetables:
- cabbage, kale/collards, carrots, beets, onions, garlic

4. Fruit with storage or processing value:
- apples, pears, berries, grapes (region dependent)

5. Fats and concentrated energy:
- sunflower, canola/rapeseed, peanuts (warmer zones), animal fats, dairy fat where livestock exists

6. Animal-source nutrient support (where acceptable):
- eggs, milk, yogurt/cheese, poultry, occasional meat

These groups are planning defaults, not strict mandates.

### 9.2) Exclusion And Down-Weighting Rules

Foods should be excluded from "community-feasible baseline" or down-weighted when:
- they require highly specialized climate outside selected region profile
- they require industrial processing that communities cannot realistically replicate
- they show poor storage stability relative to planning horizon
- they require input intensity inconsistent with scenario constraints

The UI should allow users to re-include excluded foods with an explicit override reason.

### 9.3) Resilience Constraint

To avoid brittle plans, enforce diversification checks:
- no single crop should provide more than a configurable share of total calories (default 35%)
- no single crop should provide more than a configurable share of total protein (default 50%)
- minimum number of distinct crop families in the plan (default 5)

These are resilience heuristics, not nutritional requirements.

## 10) Governance For Future Changes

Any change to requirement equations, source versions, thresholds, or nutrient definitions must:
- bump a nutrition-model version string
- be recorded in a changelog entry
- keep backwards reproducibility for historical plan reports

---

Practical outcome:
If implementation follows this standard, planning outputs are grounded in established nutrition references, auditable, and suitable for risk-aware self-sufficiency decisions.
