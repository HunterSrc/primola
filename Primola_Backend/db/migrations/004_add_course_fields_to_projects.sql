-- ==============================================================================
-- Migrazione 004: Aggiunta campi tipologia corsi, costi iscrizione e date
-- ==============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'CORSO';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS enrollment_fee NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS max_enrolled INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date DATE;
