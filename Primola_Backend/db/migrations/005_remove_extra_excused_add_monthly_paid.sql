-- ============================================================
-- Migrazione 005: Rimozione Giustificato/Extra e Piani Presenze Mensili Pagate
-- ============================================================

-- 1. Rimozione colonne is_absent_justified e is_extra da attendances
ALTER TABLE attendances DROP COLUMN IF EXISTS is_absent_justified;
ALTER TABLE attendances DROP COLUMN IF EXISTS is_extra;

-- 2. Creazione tabella student_monthly_plans per memorizzare presenze pagate mese per mese
CREATE TABLE IF NOT EXISTS student_monthly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    presenze_pagate INTEGER NOT NULL DEFAULT 0 CHECK (presenze_pagate >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_student_monthly_plans_student
        FOREIGN KEY(student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_student_year_month UNIQUE (student_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_student_monthly_plans_lookup ON student_monthly_plans(year, month);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'tg_student_monthly_plans_updated_at'
    ) THEN
        CREATE TRIGGER tg_student_monthly_plans_updated_at
        BEFORE UPDATE ON student_monthly_plans
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
