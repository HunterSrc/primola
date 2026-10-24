-- ==========================================
-- MIGRATION 001: pasti_settimanali su students
-- Da eseguire su DB esistenti (schema già creato prima di questa modifica)
-- ==========================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS pasti_settimanali SMALLINT NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pasti_settimanali') THEN
        ALTER TABLE students ADD CONSTRAINT chk_pasti_settimanali
            CHECK (pasti_settimanali >= 0 AND pasti_settimanali <= cardinality(giorni_abbonamento));
    END IF;
END $$;
