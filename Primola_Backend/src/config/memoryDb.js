const { newDb } = require('pg-mem');
const crypto = require('crypto');

let memPool = null;

function createMemoryPostgres() {
  if (memPool) return memPool;

  const db = newDb();

  // Registra estensioni e funzioni PostgreSQL standard usate nelle query
  db.public.registerFunction({
    name: 'current_database',
    implementation: () => 'primola_memory_db'
  });

  db.public.registerFunction({
    name: 'gen_random_uuid',
    impure: true,
    implementation: () => crypto.randomUUID()
  });

  db.public.registerFunction({
    name: 'now',
    impure: true,
    implementation: () => new Date()
  });

  // Schema DDL essenziale per Primola
  db.public.none(`
    CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nome VARCHAR(100) NOT NULL,
      cognome VARCHAR(100) NOT NULL,
      data_nascita DATE,
      luogo_nascita VARCHAR(150),
      residenza VARCHAR(200),
      scuola VARCHAR(150),
      giorni_abbonamento INTEGER[] DEFAULT '{1,2,3,4,5}',
      giorni_mensa INTEGER[] DEFAULT '{1,2,3,4,5}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tutors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      is_main_contact BOOLEAN DEFAULT TRUE,
      nome VARCHAR(100) NOT NULL,
      cognome VARCHAR(100) NOT NULL,
      telefono VARCHAR(50),
      email VARCHAR(100),
      residenza VARCHAR(200),
      note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS attendances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      is_present BOOLEAN DEFAULT FALSE,
      is_absent_justified BOOLEAN DEFAULT FALSE,
      canteen_used BOOLEAN DEFAULT FALSE,
      is_extra BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, date)
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      nome VARCHAR(100) NOT NULL,
      cognome VARCHAR(100),
      role VARCHAR(50) NOT NULL DEFAULT 'ADMIN',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Seed utente Admin (password: AdminPrimola2026!)
    INSERT INTO users (id, email, password_hash, nome, cognome, role)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'admin@primola.it',
      '$2b$10$Y3cwx2Jk1TCDIJGfYdit/OZt02TDzjIBrZcV9irHdH0bBBgHh8NL2',
      'Amministratore',
      'Primola',
      'ADMIN'
    );

    INSERT INTO students (id, nome, cognome, scuola, data_nascita, luogo_nascita, residenza, giorni_abbonamento, giorni_mensa)
    VALUES 
      ('33333333-3333-3333-3333-333333333333', 'Mario', 'Rossi', 'Scuola Rodari', '2016-04-12', 'Roma', 'Via Garibaldi 10', '{1,2,3,4,5}', '{1,2,3,4,5}'),
      ('44444444-4444-4444-4444-444444444444', 'Luigi', 'Bianchi', 'Scuola Collodi', '2015-11-20', 'Milano', 'Corso Como 5', '{1,2,3,4,5}', '{1,3,5}'),
      ('55555555-5555-5555-5555-555555555555', 'Sofia', 'Ferrari', 'Istituto Manzoni', '2017-02-15', 'Bologna', 'Piazza Maggiore 3', '{1,2,3,4,5}', '{2,4}');

    INSERT INTO tutors (id, student_id, is_main_contact, nome, cognome, telefono, email, residenza)
    VALUES 
      ('11111111-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', true, 'Giuseppe', 'Rossi', '+39 340 1122334', 'giuseppe.rossi@example.com', 'Via Garibaldi 10'),
      ('11111111-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', true, 'Francesco', 'Bianchi', '+39 347 5566778', 'francesco.bianchi@example.com', 'Corso Como 5'),
      ('11111111-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555', true, 'Elena', 'Ferrari', '+39 338 9988776', 'elena.ferrari@example.com', 'Piazza Maggiore 3');
  `);

  const pg = db.adapters.createPg();
  memPool = new pg.Pool();
  return memPool;
}

module.exports = {
  createMemoryPostgres
};
