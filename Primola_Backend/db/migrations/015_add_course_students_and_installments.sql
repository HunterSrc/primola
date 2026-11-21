-- Migrazione 015: Anagrafica Studenti Corsi, Iscrizioni Multi-Corso e Rate Pagamenti (1-4 rate)
-- Puramente additiva: non modifica ne sovrascrive alcuna tabella o dato esistente.

CREATE TABLE IF NOT EXISTS course_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  cognome VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  telefono VARCHAR(50),
  data_nascita DATE,
  luogo_nascita VARCHAR(150),
  indirizzo_residenza VARCHAR(255),
  citta_residenza VARCHAR(120),
  possiede_tessera BOOLEAN NOT NULL DEFAULT FALSE,
  data_scadenza_tessera DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_student_id UUID NOT NULL REFERENCES course_students(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  installments_count SMALLINT NOT NULL DEFAULT 1,
  enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(course_student_id, project_id)
);

CREATE TABLE IF NOT EXISTS course_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  installment_number SMALLINT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  paid_at DATE,
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(enrollment_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON course_enrollments(course_student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_project ON course_enrollments(project_id);
CREATE INDEX IF NOT EXISTS idx_course_installments_enrollment ON course_installments(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_course_installments_paid_at ON course_installments(paid_at);
