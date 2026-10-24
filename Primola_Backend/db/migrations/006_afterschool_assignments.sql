-- ==============================================================================
-- Migrazione 006: afterschool_assignments
-- Tabella dedicata per commessa speciale dopo scuola assegnabile a docenti (TEACHER)
-- Vincolo: 1 sola commessa dopo scuola per ogni docente (UNIQUE su user_id)
-- Accessibile/gestibile solo da ADMIN e OFFICE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS afterschool_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_afterschool_user UNIQUE (user_id)
);

DROP TRIGGER IF EXISTS tg_afterschool_assignments_updated_at ON afterschool_assignments;
CREATE TRIGGER tg_afterschool_assignments_updated_at
BEFORE UPDATE ON afterschool_assignments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_afterschool_user_id ON afterschool_assignments(user_id);
