const { newDb, DataType } = require('pg-mem');
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

  const buildJsonObject = (...args) => {
    const obj = {};
    for (let i = 0; i < args.length; i += 2) {
      obj[args[i]] = args[i + 1];
    }
    return obj;
  };

  const jsonBuildObjectSignatures = [
    [DataType.text, DataType.uuid, DataType.text, DataType.text],
    [DataType.text, DataType.text, DataType.text, DataType.text],
    [DataType.text, DataType.text, DataType.uuid, DataType.text],
    [DataType.text, DataType.uuid, DataType.text, DataType.text, DataType.text, DataType.text],
    [DataType.text, DataType.text, DataType.text, DataType.text, DataType.text, DataType.text]
  ];

  for (const sig of jsonBuildObjectSignatures) {
    db.public.registerFunction({
      name: 'json_build_object',
      args: sig,
      returns: DataType.json,
      implementation: buildJsonObject
    });
  }

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
      pasti_settimanali INTEGER DEFAULT 0,
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
      canteen_used BOOLEAN DEFAULT FALSE,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, date)
    );

    CREATE TABLE IF NOT EXISTS student_monthly_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id) ON DELETE CASCADE,
      year SMALLINT NOT NULL,
      month SMALLINT NOT NULL,
      presenze_pagate INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, year, month)
    );

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(50),
      nome VARCHAR(100),
      cognome VARCHAR(100),
      role VARCHAR(50) DEFAULT 'ADMIN',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_groups (
      user_id UUID NOT NULL,
      group_name VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, group_name)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(200) NOT NULL,
      type VARCHAR(50) DEFAULT 'CORSO',
      enrollment_fee NUMERIC(10, 2) DEFAULT 0.00,
      max_enrolled INTEGER DEFAULT 0,
      actual_enrolled INTEGER DEFAULT 0,
      start_date DATE,
      end_date DATE,
      description TEXT,
      location VARCHAR(200),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(100) PRIMARY KEY,
      value VARCHAR(255) NOT NULL,
      description TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    );

    INSERT INTO system_settings (key, value, description) VALUES
      ('doposcuola_daily_fee', '12.00', 'Quota giornaliera doposcuola per studente (€)'),
      ('meal_fee_student', '5.50', 'Quota pasto addebitata allo studente (€)'),
      ('meal_cost_provider', '4.80', 'Costo unitario pasto pagato al fornitore catering (€)');

    CREATE TABLE IF NOT EXISTS afterschool_packages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) UNIQUE,
      monthly_days INTEGER NOT NULL DEFAULT 4,
      days_per_week INTEGER,
      is_active BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS afterschool_tariffs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      package_id UUID NOT NULL,
      price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      valid_from DATE NOT NULL,
      valid_to DATE NOT NULL DEFAULT '9999-01-01',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    INSERT INTO afterschool_packages (id, name, code, monthly_days, days_per_week, sort_order) VALUES
      ('11111111-1111-1111-1111-111111111101', '1 giorno a settimana', '1_DAY_WEEK', 4, 1, 1),
      ('11111111-1111-1111-1111-111111111102', '2 giorni a settimana', '2_DAYS_WEEK', 8, 2, 2),
      ('11111111-1111-1111-1111-111111111103', '3 giorni a settimana', '3_DAYS_WEEK', 12, 3, 3),
      ('11111111-1111-1111-1111-111111111104', '4 giorni a settimana', '4_DAYS_WEEK', 16, 4, 4),
      ('11111111-1111-1111-1111-111111111105', '5 giorni a settimana', '5_DAYS_WEEK', 20, 5, 5),
      ('11111111-1111-1111-1111-111111111106', 'Una tantum', 'ONE_OFF', 1, NULL, 6);

    INSERT INTO afterschool_tariffs (id, package_id, price, valid_from, valid_to, notes) VALUES
      ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 48.00, '2026-09-01', '9999-01-01', 'Tariffa base'),
      ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 90.00, '2026-09-01', '9999-01-01', 'Tariffa base'),
      ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', 130.00, '2026-09-01', '9999-01-01', 'Tariffa base'),
      ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111104', 170.00, '2026-09-01', '9999-01-01', 'Tariffa base'),
      ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111105', 200.00, '2026-09-01', '9999-01-01', 'Tariffa base'),
      ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111106', 15.00, '2026-09-01', '9999-01-01', 'Tariffa base');

    CREATE TABLE IF NOT EXISTS student_monthly_tariffs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL,
      year SMALLINT NOT NULL,
      month SMALLINT NOT NULL,
      package_id UUID NOT NULL,
      tariff_id UUID NOT NULL,
      amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      covered_days INTEGER NOT NULL DEFAULT 0,
      assigned_at TIMESTAMP DEFAULT NOW(),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS student_monthly_settlements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL,
      year SMALLINT NOT NULL,
      month SMALLINT NOT NULL,
      extra_days_count INTEGER NOT NULL DEFAULT 0,
      extra_days_unit_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      extra_days_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      extra_paid BOOLEAN NOT NULL DEFAULT false,
      extra_paid_at TIMESTAMP,
      meals_count INTEGER NOT NULL DEFAULT 0,
      meal_unit_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      meals_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      meals_paid BOOLEAN NOT NULL DEFAULT false,
      meals_paid_at TIMESTAMP,
      payment_method VARCHAR(50),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(student_id, year, month)
    );

    CREATE TABLE IF NOT EXISTS project_teachers (
      project_id UUID NOT NULL,
      user_id UUID NOT NULL,
      hourly_rate NUMERIC(10, 2),
      assigned_hours NUMERIC(10, 2),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS afterschool_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE,
      hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS teacher_shifts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      shift_date DATE NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS closure_days (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date DATE UNIQUE NOT NULL,
      title VARCHAR(150) NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS afterschool_expenses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      expense_date DATE NOT NULL,
      category VARCHAR(20) NOT NULL,
      amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      description TEXT DEFAULT '',
      created_by UUID,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );



    INSERT INTO groups (name, description) VALUES
      ('ADMIN', 'Amministratore'),
      ('OFFICE', 'Segreteria'),
      ('TEACHER', 'Docente');

    -- Seed utente Admin (password: AdminPrimola2026!)
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone, nome, cognome, role)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'admin@primola.it',
      '$2b$10$Y3cwx2Jk1TCDIJGfYdit/OZt02TDzjIBrZcV9irHdH0bBBgHh8NL2',
      'Amministratore',
      'Primola',
      '+39 051 000000',
      'Amministratore',
      'Primola',
      'ADMIN'
    );

    INSERT INTO user_groups (user_id, group_name)
    VALUES ('00000000-0000-0000-0000-000000000001', 'ADMIN');

    INSERT INTO students (id, nome, cognome, scuola, data_nascita, luogo_nascita, residenza, giorni_abbonamento, giorni_mensa, pasti_settimanali)
    VALUES 
      ('33333333-3333-3333-3333-333333333333', 'Mario', 'Rossi', 'Scuola Rodari', '2016-04-12', 'Roma', 'Via Garibaldi 10', '{1,2,3,4,5}', '{1,2,3,4,5}', 5),
      ('44444444-4444-4444-4444-444444444444', 'Luigi', 'Bianchi', 'Scuola Collodi', '2015-11-20', 'Milano', 'Corso Como 5', '{1,2,3,4,5}', '{1,3,5}', 3),
      ('55555555-5555-5555-5555-555555555555', 'Sofia', 'Ferrari', 'Istituto Manzoni', '2017-02-15', 'Bologna', 'Piazza Maggiore 3', '{1,2,3,4,5}', '{2,4}', 2);

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
