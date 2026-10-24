-- ==============================================================================
-- Migrazione 006: teacher_shifts
-- Gestione turni orari di lavoro dei docenti nel doposcuola
-- ==============================================================================

CREATE TABLE IF NOT EXISTS teacher_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_shift_time CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_teacher_shifts_date ON teacher_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_teacher_shifts_user_date ON teacher_shifts(user_id, shift_date);

DROP TRIGGER IF EXISTS tg_teacher_shifts_updated_at ON teacher_shifts;
CREATE TRIGGER tg_teacher_shifts_updated_at
BEFORE UPDATE ON teacher_shifts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
