-- ==============================================================================
-- Migrazione 012: add user status (PENDING, APPROVED, REJECTED)
-- Aggiunge gestione approvazione registrazione utenti con default APPROVED per retrocompatibilità
-- ==============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';

-- Garantisce che tutti gli utenti storici siano considerati approvati
UPDATE users SET status = 'APPROVED' WHERE status IS NULL;
