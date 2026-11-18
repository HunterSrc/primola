-- ==========================================
-- DDL SCRIPT: Schema Primola DB
-- ==========================================

-- Abilitiamo estensioni necessarie se non giÃ  attive (gen_random_uuid() Ã¨ nativo dalla v13, ma l'estensione pgcrypto Ã¨ best practice per retrocompatibilitÃ  in alcuni scenari)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum per i ruoli
CREATE TYPE user_role AS ENUM ('ADMIN', 'STAFF');

-- ==========================================
-- Funzione Automatica per Updated_At
-- ==========================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TABELLA: users
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'STAFF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER tg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========================================
-- TABELLA: students
-- ==========================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    data_nascita DATE NOT NULL,
    luogo_nascita VARCHAR(150) NOT NULL,
    residenza VARCHAR(200) NOT NULL,
    scuola VARCHAR(150) NOT NULL,
    -- 1=LunedÃ¬, 2=MartedÃ¬ ... 7=Domenica. Si usa smallint per ottimizzazione
    giorni_abbonamento SMALLINT[] NOT NULL DEFAULT '{}',
    giorni_mensa SMALLINT[] NOT NULL DEFAULT '{}',
    -- Numero pasti settimanali spettanti: non puÃ² superare i giorni di abbonamento
    pasti_settimanali SMALLINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_pasti_settimanali
        CHECK (pasti_settimanali >= 0 AND pasti_settimanali <= cardinality(giorni_abbonamento)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER tg_students_updated_at
BEFORE UPDATE ON students
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indici GIN per ricerca veloce all'interno degli array
CREATE INDEX idx_students_giorni_abbonamento ON students USING GIN (giorni_abbonamento);
CREATE INDEX idx_students_giorni_mensa ON students USING GIN (giorni_mensa);

-- ==========================================
-- TABELLA: tutors
-- ==========================================
CREATE TABLE tutors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    residenza VARCHAR(200) NOT NULL DEFAULT 'N/D',
    telefono VARCHAR(50) NOT NULL,
    email VARCHAR(150) DEFAULT '',
    is_main_contact BOOLEAN NOT NULL DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_student
        FOREIGN KEY(student_id) 
        REFERENCES students(id)
        ON DELETE CASCADE
);

CREATE TRIGGER tg_tutors_updated_at
BEFORE UPDATE ON tutors
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_tutors_student_id ON tutors(student_id);

-- ==========================================
-- TABELLA: attendances
-- ==========================================
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    date DATE NOT NULL,
    is_present BOOLEAN NOT NULL DEFAULT FALSE,
    canteen_used BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_attendance_student
        FOREIGN KEY(student_id) 
        REFERENCES students(id)
        ON DELETE CASCADE,
    -- Un vincolo UNIQUE essenziale per evitare doppie presenze accidentali dello stesso studente nello stesso giorno
    CONSTRAINT uq_student_date UNIQUE (student_id, date)
);

CREATE TRIGGER tg_attendances_updated_at
BEFORE UPDATE ON attendances
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indici per ottimizzare pesantemente le query statistiche (ad esempio per mese/giorno) e sulle assenze
CREATE INDEX idx_attendances_date ON attendances(date);
CREATE INDEX idx_attendances_student_date ON attendances(student_id, date);

-- ==========================================
-- TABELLA: student_monthly_plans
-- ==========================================
CREATE TABLE student_monthly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    presenze_pagate INTEGER NOT NULL DEFAULT 0 CHECK (presenze_pagate >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_student_monthly_plans_student
        FOREIGN KEY(student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_student_year_month UNIQUE (student_id, year, month)
);

CREATE TRIGGER tg_student_monthly_plans_updated_at
BEFORE UPDATE ON student_monthly_plans
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_student_monthly_plans_lookup ON student_monthly_plans(year, month);

-- ==========================================
-- TABELLA: teacher_shifts
-- ==========================================
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

CREATE TRIGGER tg_teacher_shifts_updated_at
BEFORE UPDATE ON teacher_shifts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_teacher_shifts_date ON teacher_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_teacher_shifts_user_date ON teacher_shifts(user_id, shift_date);

-- ==========================================
-- TABELLA: closure_days
-- ==========================================
CREATE TABLE IF NOT EXISTS closure_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER tg_closure_days_updated_at
BEFORE UPDATE ON closure_days
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_closure_days_date ON closure_days(date);

-- ==========================================
-- TABELLA: afterschool_expenses
-- ==========================================
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

CREATE TRIGGER tg_afterschool_expenses_updated_at
BEFORE UPDATE ON afterschool_expenses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_afterschool_expenses_date ON afterschool_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_afterschool_expenses_category ON afterschool_expenses(category);



-- MIGRATIONS
-- MIGRATION: 001_add_pasti_settimanali.sql
-- ==========================================
-- MIGRATION 001: pasti_settimanali su students
-- Da eseguire su DB esistenti (schema giÃ  creato prima di questa modifica)
-- ==========================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS pasti_settimanali SMALLINT NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pasti_settimanali') THEN
        ALTER TABLE students ADD CONSTRAINT chk_pasti_settimanali
            CHECK (pasti_settimanali >= 0 AND pasti_settimanali <= cardinality(giorni_abbonamento));
    END IF;
END $$;


-- MIGRATION: 003_users_groups_projects.sql
-- ==============================================================================
-- Migrazione 003: users, groups, user_groups, projects, project_teachers
-- Supporto multi-ruolo N:N, anagrafica estesa e commesse con assegnazione docenti
-- ==============================================================================

-- 1. Aggiornamento Tabella users
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Se presenti vecchie colonne nome/cognome, migriamo i dati
UPDATE users 
SET first_name = nome 
WHERE first_name IS NULL AND nome IS NOT NULL;

UPDATE users 
SET last_name = cognome 
WHERE last_name IS NULL AND cognome IS NOT NULL;

-- 2. Tabella groups (Ruoli di sistema)
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserimento gruppi standard se non presenti
INSERT INTO groups (name, description) VALUES
    ('ADMIN', 'Amministratore di sistema con accesso completo'),
    ('OFFICE', 'Personale di segreteria/ufficio con permessi operativi'),
    ('TEACHER', 'Docente/Insegnante con accesso ristretto al proprio profilo')
ON CONFLICT (name) DO NOTHING;

-- 3. Tabella N:N user_groups
CREATE TABLE IF NOT EXISTS user_groups (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_name VARCHAR(50) NOT NULL REFERENCES groups(name) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, group_name)
);

-- Migrazione ruoli esistenti da users.role verso user_groups
INSERT INTO user_groups (user_id, group_name)
SELECT id, 
       CASE 
           WHEN role = 'ADMIN' THEN 'ADMIN'
           WHEN role = 'STAFF' THEN 'TEACHER'
           ELSE 'TEACHER'
       END
FROM users
ON CONFLICT (user_id, group_name) DO NOTHING;

-- 4. Tabella projects (Commesse)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger aggiornamento automatico updated_at per projects
DROP TRIGGER IF EXISTS tg_projects_updated_at ON projects;
CREATE TRIGGER tg_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. Tabella N:N project_teachers (Associazione Commessa <-> Docente con compensi)
CREATE TABLE IF NOT EXISTS project_teachers (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hourly_rate NUMERIC(10, 2) DEFAULT NULL,
    assigned_hours NUMERIC(10, 2) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

DROP TRIGGER IF EXISTS tg_project_teachers_updated_at ON project_teachers;
CREATE TRIGGER tg_project_teachers_updated_at
BEFORE UPDATE ON project_teachers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- MIGRATION: 004_add_course_fields_to_projects.sql
-- ==============================================================================
-- Migrazione 004: Aggiunta campi tipologia corsi, costi iscrizione e date
-- ==============================================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'CORSO';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS enrollment_fee NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS max_enrolled INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_date DATE;


-- MIGRATION: 005_remove_extra_excused_add_monthly_paid.sql
-- ============================================================
-- Migrazione 005: Rimozione Giustificato/Extra e Piani Presenze Mensili Pagate
-- ============================================================

-- 1. Rimozione colonne is_absent_justified e is_extra da attendances
ALTER TABLE attendances DROP COLUMN IF EXISTS is_absent_justified;
ALTER TABLE attendances DROP COLUMN IF EXISTS is_extra;

-- 2. Creazione tabella student_monthly_plans per memorizzare presenze pagate mese per mese
CREATE TABLE IF NOT EXISTS student_monthly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    presenze_pagate INTEGER NOT NULL DEFAULT 0 CHECK (presenze_pagate >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_student_monthly_plans_student
        FOREIGN KEY(student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,
    CONSTRAINT uq_student_year_month UNIQUE (student_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_student_monthly_plans_lookup ON student_monthly_plans(year, month);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'tg_student_monthly_plans_updated_at'
    ) THEN
        CREATE TRIGGER tg_student_monthly_plans_updated_at
        BEFORE UPDATE ON student_monthly_plans
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;


-- MIGRATION: 006_afterschool_assignments.sql
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


-- MIGRATION: 006_teacher_shifts.sql
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


-- MIGRATION: 007_closure_days.sql
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


-- MIGRATION: 008_system_settings_and_enrolled.sql
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
    ('doposcuola_daily_fee', '12.00', 'Quota giornaliera doposcuola per studente (â‚¬)'),
    ('meal_fee_student', '5.50', 'Quota pasto addebitata allo studente (â‚¬)'),
    ('meal_cost_provider', '4.80', 'Costo unitario pasto pagato al fornitore catering (â‚¬)')
ON CONFLICT (key) DO NOTHING;

-- 2. Colonna actual_enrolled per conteggio iscritti effettivi sulle commesse/corsi
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_enrolled INTEGER DEFAULT 0;


-- MIGRATION: 009_afterschool_expenses.sql
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


-- MIGRATION: 009_afterschool_packages_and_tariffs.sql
-- ==============================================================================
-- Migrazione 009: afterschool_packages e afterschool_tariffs
-- Catalogo pacchetti doposcuola e storico tariffe a validitÃ  temporale
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


-- MIGRATION: 010_student_monthly_tariffs_and_payments.sql
-- ==============================================================================
-- Migrazione 010: student_monthly_tariffs e student_monthly_settlements
-- Gestione multi-tariffe doposcuola studenti e saldi extra / pasti
-- ==============================================================================

-- 1. Associazione studente - pacchetto doposcuola per specifico mese/anno
-- Supporta piÃ¹ pacchetti per lo stesso studente nello stesso mese
CREATE TABLE IF NOT EXISTS student_monthly_tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL,
    package_id UUID NOT NULL REFERENCES afterschool_packages(id) ON DELETE CASCADE,
    tariff_id UUID NOT NULL REFERENCES afterschool_tariffs(id) ON DELETE CASCADE,
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    covered_days INTEGER NOT NULL DEFAULT 0,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_monthly_tariffs_period ON student_monthly_tariffs(year, month);
CREATE INDEX IF NOT EXISTS idx_student_monthly_tariffs_student ON student_monthly_tariffs(student_id);

-- 2. Saldi mensili per extra (giorni eccedenti a tariffa una tantum) e pasti cumulativi
CREATE TABLE IF NOT EXISTS student_monthly_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL,
    extra_days_count INTEGER NOT NULL DEFAULT 0,
    extra_days_unit_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    extra_days_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    extra_paid BOOLEAN NOT NULL DEFAULT false,
    extra_paid_at TIMESTAMP WITH TIME ZONE,
    meals_count INTEGER NOT NULL DEFAULT 0,
    meal_unit_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    meals_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    meals_paid BOOLEAN NOT NULL DEFAULT false,
    meals_paid_at TIMESTAMP WITH TIME ZONE,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_student_monthly_settlement UNIQUE(student_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_student_monthly_settlements_period ON student_monthly_settlements(year, month);

-- Triggers updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at') THEN
        DROP TRIGGER IF EXISTS tg_student_monthly_tariffs_updated_at ON student_monthly_tariffs;
        CREATE TRIGGER tg_student_monthly_tariffs_updated_at
        BEFORE UPDATE ON student_monthly_tariffs
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

        DROP TRIGGER IF EXISTS tg_student_monthly_settlements_updated_at ON student_monthly_settlements;
        CREATE TRIGGER tg_student_monthly_settlements_updated_at
        BEFORE UPDATE ON student_monthly_settlements
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;


-- SEED DATA
-- ==========================================
-- DML SCRIPT: Seeding di test per Backend
-- ==========================================

-- ATTENZIONE: le password inserite sono 'password123' ma Ã¨ necessario usare una 
-- vera libreria come bcrypt su Node.js (in questo dump metto degli hash fittizi per l'esempio)

;