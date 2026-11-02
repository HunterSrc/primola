-- ==============================================================================
-- Migrazione 010: student_monthly_tariffs e student_monthly_settlements
-- Gestione multi-tariffe doposcuola studenti e saldi extra / pasti
-- ==============================================================================

-- 1. Associazione studente - pacchetto doposcuola per specifico mese/anno
-- Supporta più pacchetti per lo stesso studente nello stesso mese
CREATE TABLE IF NOT EXISTS student_monthly_tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL,
    package_id UUID NOT NULL REFERENCES afterschool_packages(id) ON DELETE CASCADE,
    tariff_id UUID NOT NULL REFERENCES afterschool_tariffs(id) ON DELETE CASCADE,
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    covered_days INTEGER NOT NULL DEFAULT 0,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_monthly_tariffs_period ON student_monthly_tariffs(year, month);
CREATE INDEX IF NOT EXISTS idx_student_monthly_tariffs_student ON student_monthly_tariffs(student_id);

-- 2. Saldi mensili per extra (giorni eccedenti a tariffa una tantum) e pasti cumulativi
CREATE TABLE IF NOT EXISTS student_monthly_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL,
    extra_days_count INTEGER NOT NULL DEFAULT 0,
    extra_days_unit_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    extra_days_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    extra_paid BOOLEAN NOT NULL DEFAULT false,
    extra_paid_at TIMESTAMP WITH TIME ZONE,
    meals_count INTEGER NOT NULL DEFAULT 0,
    meal_unit_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    meals_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    meals_paid BOOLEAN NOT NULL DEFAULT false,
    meals_paid_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_student_monthly_settlement UNIQUE(student_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_student_monthly_settlements_period ON student_monthly_settlements(year, month);

-- Triggers updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
        DROP TRIGGER IF EXISTS tg_student_monthly_tariffs_updated_at ON student_monthly_tariffs;
        CREATE TRIGGER tg_student_monthly_tariffs_updated_at
        BEFORE UPDATE ON student_monthly_tariffs
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

        DROP TRIGGER IF EXISTS tg_student_monthly_settlements_updated_at ON student_monthly_settlements;
        CREATE TRIGGER tg_student_monthly_settlements_updated_at
        BEFORE UPDATE ON student_monthly_settlements
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;
