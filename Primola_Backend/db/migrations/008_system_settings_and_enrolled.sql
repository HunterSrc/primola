-- ==============================================================================
-- Migrazione 008: system_settings e actual_enrolled su projects
-- Configurazione tariffe economiche e iscritti effettivi ai corsi
-- ==============================================================================

-- 1. Tabella system_settings per memorizzare tariffe configurabili
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value VARCHAR(255) NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger per updated_at su system_settings se esiste set_updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
        DROP TRIGGER IF EXISTS tg_system_settings_updated_at ON system_settings;
        CREATE TRIGGER tg_system_settings_updated_at
        BEFORE UPDATE ON system_settings
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- Inserimento valori iniziali predefiniti
INSERT INTO system_settings (key, value, description) VALUES
    ('doposcuola_daily_fee', '12.00', 'Quota giornaliera doposcuola per studente (€)'),
    ('meal_fee_student', '5.50', 'Quota pasto addebitata allo studente (€)'),
    ('meal_cost_provider', '4.80', 'Costo unitario pasto pagato al fornitore catering (€)')
ON CONFLICT (key) DO NOTHING;

-- 2. Colonna actual_enrolled per conteggio iscritti effettivi sulle commesse/corsi
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_enrolled INTEGER DEFAULT 0;
