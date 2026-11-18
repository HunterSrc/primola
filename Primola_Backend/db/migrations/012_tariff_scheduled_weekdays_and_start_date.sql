-- ==============================================================================
-- Migrazione 012: scheduled_weekdays e start_date su student_monthly_tariffs (D11)
-- Pianificazione giorni settimanali mensili nei pagamenti doposcuola e data decorrenza
-- ==============================================================================

ALTER TABLE student_monthly_tariffs
    ADD COLUMN IF NOT EXISTS scheduled_weekdays SMALLINT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS start_date DATE;

-- Backfill dei record esistenti:
-- 1. start_date = primo giorno del mese/anno di riferimento se NULL
-- 2. scheduled_weekdays = copia da students.giorni_abbonamento se vuoto
UPDATE student_monthly_tariffs smt
SET start_date = COALESCE(smt.start_date, make_date(smt.year::int, smt.month::int, 1)),
    scheduled_weekdays = CASE
        WHEN smt.scheduled_weekdays IS NULL OR cardinality(smt.scheduled_weekdays) = 0
        THEN COALESCE(s.giorni_abbonamento, '{}')
        ELSE smt.scheduled_weekdays
    END
FROM students s
WHERE s.id = smt.student_id;

-- Sicurezza per eventuali righe orfane (se presenti)
UPDATE student_monthly_tariffs
SET start_date = COALESCE(start_date, make_date(year::int, month::int, 1))
WHERE start_date IS NULL;

ALTER TABLE student_monthly_tariffs
    ALTER COLUMN start_date SET DEFAULT CURRENT_DATE,
    ALTER COLUMN start_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_monthly_tariffs_schedule
    ON student_monthly_tariffs(year, month, start_date);
