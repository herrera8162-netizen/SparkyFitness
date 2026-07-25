BEGIN;

-- Soda/sugary-drink tracking, mirroring the water_intake_entries + container
-- pattern (entries-only, no separate daily-rollup table — the daily total is
-- computed with SUM(soda_ml) at read time).

CREATE TABLE public.user_soda_containers (
    id SERIAL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    volume NUMERIC(10,3) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- 'ml', 'oz', 'cup'
    is_primary BOOLEAN DEFAULT false,
    servings_per_container INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.soda_intake_entries (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    soda_ml NUMERIC(10,3) NOT NULL,
    container_id INTEGER REFERENCES public.user_soda_containers(id) ON DELETE SET NULL,
    container_name VARCHAR(255),
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id UUID REFERENCES public."user"(id),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_soda_intake_entries_user_date
    ON public.soda_intake_entries(user_id, entry_date);

ALTER TABLE public.user_preferences
ADD COLUMN soda_display_unit VARCHAR(50) DEFAULT 'ml';

COMMIT;
