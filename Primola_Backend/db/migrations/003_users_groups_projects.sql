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
