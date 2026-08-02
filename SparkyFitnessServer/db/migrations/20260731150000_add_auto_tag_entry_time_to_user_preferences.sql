-- Migration: Add auto_tag_entry_time column to user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN IF NOT EXISTS auto_tag_entry_time BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.user_preferences.auto_tag_entry_time IS
  'When true, automatically tag new food and exercise diary logs with current wall-clock time. When false, entry_time defaults to null.';
