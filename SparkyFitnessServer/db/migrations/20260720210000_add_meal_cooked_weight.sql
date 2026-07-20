-- MEAL_WEIGHT_PLAN.md Phase 1: decouple cooked (plate) weight from the
-- serving-unit model added in 20260515174155_serving_size_model.sql.
--
-- Today a meal must choose: either it yields "N servings" (serving_unit =
-- 'serving') or it is measured in grams (serving_unit = 'g'), but not both.
-- cooked_weight_g is an ALTERNATE denominator, not a replacement: when set,
-- a food_entry_meals row may log in grams (plate weight) regardless of the
-- meal's serving_unit, using
--   multiplier = plate_grams / cooked_weight_g
-- instead of the uniform serving_size × total_servings denominator.

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS cooked_weight_g NUMERIC NULL
    CHECK (cooked_weight_g IS NULL OR cooked_weight_g > 0);

COMMENT ON COLUMN public.meals.cooked_weight_g IS
  'Mass in grams of the full recipe as finished/cooked (e.g. the weighed weight of the whole pot). An alternate denominator alongside serving_size × total_servings: when set, food_entry_meals may log plate weight in grams via multiplier = plate_grams / cooked_weight_g, independent of serving_unit.';
