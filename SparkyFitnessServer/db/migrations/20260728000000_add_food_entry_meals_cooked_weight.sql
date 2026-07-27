-- Migration: Add cooked_weight_g and cooked_weight_source to food_entry_meals
-- Allows logged meal instances to store their specific cooked weight and calculation source.

ALTER TABLE food_entry_meals
  ADD COLUMN IF NOT EXISTS cooked_weight_g NUMERIC NULL CHECK (cooked_weight_g IS NULL OR cooked_weight_g > 0),
  ADD COLUMN IF NOT EXISTS cooked_weight_source TEXT NULL CHECK (cooked_weight_source IS NULL OR cooked_weight_source IN ('manual', 'auto_sum'));
