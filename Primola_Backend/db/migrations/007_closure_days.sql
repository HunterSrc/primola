-- ==============================================================================
-- Migrazione 007: closure_days
-- Gestione date di chiusura straordinarie/personalizzate inserite da Admin
-- ==============================================================================

CREATE TABLE IF NOT EXISTS closure_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_closure_days_date ON closure_days(date);

DROP TRIGGER IF EXISTS tg_closure_days_updated_at ON closure_days;
CREATE TRIGGER tg_closure_days_updated_at
BEFORE UPDATE ON closure_days
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
