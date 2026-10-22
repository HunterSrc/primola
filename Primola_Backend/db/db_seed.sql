-- ==========================================
-- DML SCRIPT: Seeding di test per Backend
-- ==========================================

-- ATTENZIONE: le password inserite sono 'password123' ma è necessario usare una 
-- vera libreria come bcrypt su Node.js (in questo dump metto degli hash fittizi per l'esempio)

-- 1. Inserimento Utenti
INSERT INTO users (id, username, password_hash, role)
VALUES 
    -- admin1 / (hash di 'password123')
    ('11111111-1111-1111-1111-111111111111', 'admin1', '$2b$10$tZ2R8zM/L6A72sYyB9wS0OuL0qB.TqD0/fXw8zG9S5nS0UvQZz1C6', 'ADMIN'),
    -- staff1 / (hash di 'password123')
    ('22222222-2222-2222-2222-222222222222', 'staff1', '$2b$10$tZ2R8zM/L6A72sYyB9wS0OuL0qB.TqD0/fXw8zG9S5nS0UvQZz1C6', 'STAFF');

-- 2. Inserimento Studenti (Usiamo UUID prefissati per poter collegare le successive FK)
INSERT INTO students (id, nome, cognome, data_nascita, luogo_nascita, residenza, scuola, giorni_abbonamento, giorni_mensa)
VALUES 
    -- Mario Rossi (abbonamento Lu, Me, Ve - Mensa Lu, Me)
    ('33333333-3333-3333-3333-333333333333', 'Mario', 'Rossi', '2015-05-14', 'Roma', 'Via Roma 10, Roma', 'Scuola Elementare Garibaldi', '{1, 3, 5}', '{1, 3}'),
    -- Luigi Bianchi (abbonamento tutti i giorni - Mensa Ma, Gi)
    ('44444444-4444-4444-4444-444444444444', 'Luigi', 'Bianchi', '2016-09-21', 'Milano', 'Via Milano 20, Roma', 'Scuola Elementare Garibaldi', '{1, 2, 3, 4, 5}', '{2, 4}');

-- 3. Inserimento Tutori (Almeno uno per studente, con is_main_contact = true per il principale)
INSERT INTO tutors (student_id, nome, cognome, residenza, telefono, is_main_contact, note)
VALUES 
    -- Tutori per Mario Rossi
    ('33333333-3333-3333-3333-333333333333', 'Giuseppe', 'Rossi', 'Via Roma 10, Roma', '+39 333 1112233', TRUE, 'Padre, contattare prima lui'),
    ('33333333-3333-3333-3333-333333333333', 'Anna', 'Verdi', 'Via Roma 10, Roma', '+39 333 4445566', FALSE, 'Madre'),
    
    -- Tutore per Luigi Bianchi
    ('44444444-4444-4444-4444-444444444444', 'Francesco', 'Bianchi', 'Via Milano 20, Roma', '+39 333 7778899', TRUE, 'Nonno autorizzato al ritiro');

-- 4. Inserimento Presenze (Simulazione per il giorno corrente e il giorno precedente)
INSERT INTO attendances (student_id, date, is_present, is_absent_justified, canteen_used, is_extra)
VALUES 
    -- Presenze di Mario (Ieri: presente, ha mangiato in mensa. Oggi: assente giustificato)
    ('33333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '1 day', TRUE, FALSE, TRUE, FALSE),
    ('33333333-3333-3333-3333-333333333333', CURRENT_DATE, FALSE, TRUE, FALSE, FALSE),
    
    -- Presenze di Luigi (Ieri: presente ma non ha usato la mensa. Oggi: presente come EXTRA - fuori abbonamento - e usato mensa)
    ('44444444-4444-4444-4444-444444444444', CURRENT_DATE - INTERVAL '1 day', TRUE, FALSE, FALSE, FALSE),
    ('44444444-4444-4444-4444-444444444444', CURRENT_DATE, TRUE, FALSE, TRUE, TRUE);
