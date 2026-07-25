-- Tracks the provenance of cooked_weight_g (20260720210000_add_meal_cooked_weight.sql)
-- and, per ingredient, whether its gram contribution is deterministic (a known
-- weight/volume unit converted by fixed math) or AI-estimated (density guess
-- for volume units, or a "typical weight of one X" guess for count units like
-- "slice"/"piece"). Backs the auto-sum meal-weight MCP actions.

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS cooked_weight_source TEXT NULL
    CHECK (cooked_weight_source IS NULL OR cooked_weight_source IN ('manual', 'auto_sum'));

COMMENT ON COLUMN public.meals.cooked_weight_source IS
  'How cooked_weight_g was set: manual (user typed it) or auto_sum (computed from ingredient weights). Null if cooked_weight_g has never been set.';

ALTER TABLE public.meal_foods
  ADD COLUMN IF NOT EXISTS resolved_weight_g NUMERIC NULL
    CHECK (resolved_weight_g IS NULL OR resolved_weight_g > 0),
  ADD COLUMN IF NOT EXISTS weight_source TEXT NULL
    CHECK (weight_source IS NULL OR weight_source IN ('deterministic', 'ai_estimated')),
  ADD COLUMN IF NOT EXISTS weight_confidence TEXT NULL
    CHECK (weight_confidence IS NULL OR weight_confidence IN ('high', 'medium', 'low'));

COMMENT ON COLUMN public.meal_foods.resolved_weight_g IS
  'Gram weight last resolved for this ingredient by the auto-sum meal-weight action. Null until auto-sum has run.';
COMMENT ON COLUMN public.meal_foods.weight_source IS
  'deterministic: unit was already weight/volume, converted by fixed math. ai_estimated: AI supplied the gram estimate (volume density, or count-unit weight guess).';
COMMENT ON COLUMN public.meal_foods.weight_confidence IS
  'AI-reported confidence (high/medium/low) for resolved_weight_g. Only set when weight_source = ai_estimated.';
