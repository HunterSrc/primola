-- ==============================================================================
-- Migrazione 009: afterschool_packages e afterschool_tariffs
-- Catalogo pacchetti doposcuola e storico tariffe a validità temporale
-- ==============================================================================

CREATE TABLE IF NOT EXISTS afterschool_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE,
    monthly_days INTEGER NOT NULL DEFAULT 4,
    days_per_week INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS afterschool_tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES afterschool_packages(id) ON DELETE CASCADE,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL DEFAULT '9999-01-01',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_afterschool_tariffs_package ON afterschool_tariffs(package_id);
CREATE INDEX IF NOT EXISTS idx_afterschool_tariffs_dates ON afterschool_tariffs(valid_from, valid_to);

-- Trigger per updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
        DROP TRIGGER IF EXISTS tg_afterschool_packages_updated_at ON afterschool_packages;
        CREATE TRIGGER tg_afterschool_packages_updated_at
        BEFORE UPDATE ON afterschool_packages
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

        DROP TRIGGER IF EXISTS tg_afterschool_tariffs_updated_at ON afterschool_tariffs;
        CREATE TRIGGER tg_afterschool_tariffs_updated_at
        BEFORE UPDATE ON afterschool_tariffs
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- Pacchetti predefiniti
INSERT INTO afterschool_packages (id, name, code, monthly_days, days_per_week, sort_order)
VALUES
    ('11111111-1111-1111-1111-111111111101', '1 giorno a settimana', '1_DAY_WEEK', 4, 1, 1),
    ('11111111-1111-1111-1111-111111111102', '2 giorni a settimana', '2_DAYS_WEEK', 8, 2, 2),
    ('11111111-1111-1111-1111-111111111103', '3 giorni a settimana', '3_DAYS_WEEK', 12, 3, 3),
    ('11111111-1111-1111-1111-111111111104', '4 giorni a settimana', '4_DAYS_WEEK', 16, 4, 4),
    ('11111111-1111-1111-1111-111111111105', '5 giorni a settimana', '5_DAYS_WEEK', 20, 5, 5),
    ('11111111-1111-1111-1111-111111111106', 'Una tantum', 'ONE_OFF', 1, NULL, 6)
ON CONFLICT (code) DO NOTHING;

-- Tariffe iniziali valide fino al 9999-01-01
INSERT INTO afterschool_tariffs (package_id, price, valid_from, valid_to, notes)
SELECT id, 
       CASE 
         WHEN code = '1_DAY_WEEK' THEN 48.00
         WHEN code = '2_DAYS_WEEK' THEN 90.00
         WHEN code = '3_DAYS_WEEK' THEN 130.00
         WHEN code = '4_DAYS_WEEK' THEN 170.00
         WHEN code = '5_DAYS_WEEK' THEN 200.00
         WHEN code = 'ONE_OFF' THEN 15.00
         ELSE 0.00
       END,
       '2026-09-01',
       '9999-01-01',
       'Tariffa base iniziale'
FROM afterschool_packages
WHERE NOT EXISTS (
    SELECT 1 FROM afterschool_tariffs WHERE afterschool_tariffs.package_id = afterschool_packages.id
);
