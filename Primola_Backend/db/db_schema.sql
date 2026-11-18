-- ==========================================
-- DDL SCRIPT: Schema Primola DB
-- ==========================================

-- Abilitiamo estensioni necessarie se non già attive (gen_random_uuid() è nativo dalla v13, ma l'estensione pgcrypto è best practice per retrocompatibilità in alcuni scenari)
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
    -- 1=Lunedì, 2=Martedì ... 7=Domenica. Si usa smallint per ottimizzazione
    giorni_abbonamento SMALLINT[] NOT NULL DEFAULT '{}',
    giorni_mensa SMALLINT[] NOT NULL DEFAULT '{}',
    -- Numero pasti settimanali spettanti: non può superare i giorni di abbonamento
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

-- ==========================================
-- TABELLE: afterschool_packages & afterschool_tariffs
-- ==========================================
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

CREATE TRIGGER tg_afterschool_packages_updated_at
BEFORE UPDATE ON afterschool_packages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

CREATE TRIGGER tg_afterschool_tariffs_updated_at
BEFORE UPDATE ON afterschool_tariffs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_afterschool_tariffs_package ON afterschool_tariffs(package_id);
CREATE INDEX IF NOT EXISTS idx_afterschool_tariffs_dates ON afterschool_tariffs(valid_from, valid_to);

-- ==========================================
-- TABELLE: student_monthly_tariffs & student_monthly_settlements
-- ==========================================
CREATE TABLE IF NOT EXISTS student_monthly_tariffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    year SMALLINT NOT NULL,
    month SMALLINT NOT NULL,
    package_id UUID NOT NULL REFERENCES afterschool_packages(id) ON DELETE CASCADE,
    tariff_id UUID NOT NULL REFERENCES afterschool_tariffs(id) ON DELETE CASCADE,
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    covered_days INTEGER NOT NULL DEFAULT 0,
    scheduled_weekdays SMALLINT[] NOT NULL DEFAULT '{}',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER tg_student_monthly_tariffs_updated_at
BEFORE UPDATE ON student_monthly_tariffs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_student_monthly_tariffs_period ON student_monthly_tariffs(year, month);
CREATE INDEX IF NOT EXISTS idx_student_monthly_tariffs_student ON student_monthly_tariffs(student_id);
CREATE INDEX IF NOT EXISTS idx_student_monthly_tariffs_schedule ON student_monthly_tariffs(year, month, start_date);

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

CREATE TRIGGER tg_student_monthly_settlements_updated_at
BEFORE UPDATE ON student_monthly_settlements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_student_monthly_settlements_period ON student_monthly_settlements(year, month);


