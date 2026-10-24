-- ==========================================
-- DML SCRIPT: Seeding di test per Backend
-- ==========================================

-- ATTENZIONE: le password inserite sono 'password123' ma è necessario usare una 
-- vera libreria come bcrypt su Node.js (in questo dump metto degli hash fittizi per l'esempio)

-- 1. Inserimento Utenti
INSERT INTO users (id, email, password_hash, nome, cognome, role)
VALUES 
    -- admin@primola.it / AdminPrimola2026!
    ('11111111-1111-1111-1111-111111111111', 'admin@primola.it', '$2b$10$19h/EfTJY049WZSg/ut/g.yvjEhaVkESi5Bwrl1kkxfSs1XpwAqdm', 'Amministratore', 'Primola', 'ADMIN'),
    -- staff@primola.it / StaffPrimola2026!
    ('22222222-2222-2222-2222-222222222222', 'staff@primola.it', '$2b$10$7vWS.mLApihDwZDToM9/L.WLXEzHNFhKK6UM.M.99e3ZAaWq.S67C', 'Operatore', 'Staff', 'STAFF');

-- 2. Inserimento Studenti (Usiamo UUID prefissati per poter collegare le successive FK)
INSERT INTO students (id, nome, cognome, data_nascita, luogo_nascita, residenza, scuola, giorni_abbonamento, giorni_mensa, pasti_settimanali)
VALUES 
    -- Mario Rossi (abbonamento Lu, Me, Ve - Mensa Lu, Me - 2 pasti/settimana)
    ('33333333-3333-3333-3333-333333333333', 'Mario', 'Rossi', '2015-05-14', 'Roma', 'Via Roma 10, Roma', 'Scuola Elementare Garibaldi', '{1, 3, 5}', '{1, 3}', 2),
    -- Luigi Bianchi (abbonamento Ma, Gi - Mensa Ma, Gi - 2 pasti/settimana)
    ('44444444-4444-4444-4444-444444444444', 'Luigi', 'Bianchi', '2016-09-21', 'Milano', 'Via Milano 20, Roma', 'Scuola Elementare Garibaldi', '{2, 4}', '{2, 4}', 2);

-- 3. Inserimento Tutori (Almeno uno per studente, con is_main_contact = true per il principale)
INSERT INTO tutors (student_id, nome, cognome, residenza, telefono, email, is_main_contact, note)
VALUES 
    -- Tutori per Mario Rossi
    ('33333333-3333-3333-3333-333333333333', 'Giuseppe', 'Rossi', 'Via Roma 10, Roma', '+39 333 1112233', 'giuseppe.rossi@example.com', TRUE, 'Padre'),
    ('33333333-3333-3333-3333-333333333333', 'Anna', 'Verdi', 'Via Roma 10, Roma', '+39 333 4445566', 'anna.verdi@example.com', FALSE, 'Madre'),
    
    -- Tutore per Luigi Bianchi
    ('44444444-4444-4444-4444-444444444444', 'Francesco', 'Bianchi', 'Via Milano 20, Roma', '+39 333 7778899', 'francesco.bianchi@example.com', TRUE, 'Nonno/a');

-- 4. Inserimento Presenze (Simulazione per il giorno corrente e il giorno precedente)
INSERT INTO attendances (student_id, date, is_present, canteen_used, notes)
VALUES 
    -- Presenze di Mario (Ieri: presente, ha mangiato in mensa. Oggi: assente)
    ('33333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '1 day', TRUE, TRUE, ''),
    ('33333333-3333-3333-3333-333333333333', CURRENT_DATE, FALSE, FALSE, 'Assente'),
    
    -- Presenze di Luigi (Ieri: presente ma non ha usato la mensa. Oggi: presente e usato mensa)
    ('44444444-4444-4444-4444-444444444444', CURRENT_DATE - INTERVAL '1 day', TRUE, FALSE, ''),
    ('44444444-4444-4444-4444-444444444444', CURRENT_DATE, TRUE, TRUE, 'Ingresso venerdì');

-- 5. Storico mese precedente per il report mensa
INSERT INTO attendances (student_id, date, is_present, canteen_used, notes)
SELECT s.id, d::date, TRUE,
       (EXTRACT(ISODOW FROM d)::int = ANY(s.giorni_mensa) AND (s.id <> '44444444-4444-4444-4444-444444444444' OR EXTRACT(ISODOW FROM d)::int = 2)),
       ''
FROM students s
CROSS JOIN generate_series(
    date_trunc('month', CURRENT_DATE) - INTERVAL '1 month',
    date_trunc('month', CURRENT_DATE) - INTERVAL '1 day',
    INTERVAL '1 day'
) d
WHERE EXTRACT(ISODOW FROM d)::int = ANY(s.giorni_abbonamento)
ON CONFLICT (student_id, date) DO NOTHING;

-- 6. Piani Presenze Mensili Pagate
INSERT INTO student_monthly_plans (student_id, year, month, presenze_pagate)
VALUES
    ('33333333-3333-3333-3333-333333333333', EXTRACT(YEAR FROM CURRENT_DATE)::smallint, EXTRACT(MONTH FROM CURRENT_DATE)::smallint, 20),
    ('44444444-4444-4444-4444-444444444444', EXTRACT(YEAR FROM CURRENT_DATE)::smallint, EXTRACT(MONTH FROM CURRENT_DATE)::smallint, 16)
ON CONFLICT (student_id, year, month) DO UPDATE SET presenze_pagate = EXCLUDED.presenze_pagate;
