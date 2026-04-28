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
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'STAFF',
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
    residenza VARCHAR(200) NOT NULL,
    telefono VARCHAR(50) NOT NULL,
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
    is_absent_justified BOOLEAN NOT NULL DEFAULT FALSE,
    canteen_used BOOLEAN NOT NULL DEFAULT FALSE,
    is_extra BOOLEAN NOT NULL DEFAULT FALSE,
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
