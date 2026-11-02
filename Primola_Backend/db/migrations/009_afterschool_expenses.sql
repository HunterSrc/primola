-- ==============================================================================
-- Migrazione 009: afterschool_expenses
-- Gestione e rendicontazione note spese doposcuola (Mensa / Altro)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS afterschool_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_date DATE NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('MENSA', 'ALTRO')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    description TEXT DEFAULT '',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
        DROP TRIGGER IF EXISTS tg_afterschool_expenses_updated_at ON afterschool_expenses;
        CREATE TRIGGER tg_afterschool_expenses_updated_at
        BEFORE UPDATE ON afterschool_expenses
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_afterschool_expenses_date ON afterschool_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_afterschool_expenses_category ON afterschool_expenses(category);
