-- ==============================================================================
-- Migrazione 013: meal_tariffs
-- Storico tariffa mensa (quota pasto addebitata allo studente) con validità temporale
-- ==============================================================================

CREATE TABLE IF NOT EXISTS meal_tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price NUMERIC(10,2) NOT NULL DEFAULT 5.50,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL DEFAULT '9999-01-01',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_tariffs_dates ON meal_tariffs(valid_from, valid_to);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
        DROP TRIGGER IF EXISTS tg_meal_tariffs_updated_at ON meal_tariffs;
        CREATE TRIGGER tg_meal_tariffs_updated_at
        BEFORE UPDATE ON meal_tariffs
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- Popolamento iniziale da system_settings se la tabella è vuota
INSERT INTO meal_tariffs (price, valid_from, valid_to, notes)
SELECT
    COALESCE((SELECT CAST(value AS NUMERIC(10,2)) FROM system_settings WHERE key = 'meal_fee_student' LIMIT 1), 5.50),
    '2025-01-01',
    '9999-01-01',
    'Tariffa mensa iniziale migrata da impostazioni di sistema'
WHERE NOT EXISTS (SELECT 1 FROM meal_tariffs);
