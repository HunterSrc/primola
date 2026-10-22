<ruolo>
Agisci come un Database Architect e Amministratore PostgreSQL di livello Senior.
</ruolo>

<contesto>
Stiamo sviluppando "Primola", un'applicazione gestionale ad uso interno per registrare le presenze (5 utenti staff, di cui 1 admin).
L'architettura è On-Premise (rete LAN). Il backend sarà in Node.js, il frontend in Flutter Web.
Il tuo compito è progettare lo schema del database relazionale.
</contesto>

<regole_architetturali_inviolabili>
1. Utilizza esclusivamente `UUID` (gen_random_uuid()) per tutte le Primary Key (PK).
2. Ogni tabella deve avere le colonne `created_at` e `updated_at` (timestamp with time zone, default NOW()).
3. Applica vincoli di Foreign Key (FK) rigorosi con logiche di `ON DELETE CASCADE` solo dove ha senso (es. eliminando uno studente si eliminano i suoi tutori e le sue presenze).
4. La gestione dei "Giorni Abbonamento" e "Giorni Mensa" per gli studenti deve essere gestita tramite array di interi (1=Lunedì, 7=Domenica) oppure tabelle di associazione, scegli tu la più efficiente per query di tipo "chi doveva essere presente oggi?".
5. Nomi tabelle e colonne: usa lo standard `snake_case`.
</regole_architetturali_inviolabili>

<modello_dati_richiesto>
- `users`: id, username, password_hash, role (Enum: ADMIN, STAFF).
- `students`: id, nome, cognome, data_nascita, luogo_nascita, residenza, scuola, giorni_abbonamento, giorni_mensa. (Tutti i campi stringa e data sono obbligatori).
- `tutors`: id, student_id (FK), nome, cognome, residenza, telefono, is_main_contact (boolean), note. (Almeno un tutor per studente).
- `attendances`: id, student_id (FK), date (date), is_present (boolean), is_absent_justified (boolean), canteen_used (boolean), is_extra (boolean).
</modello_dati_richiesto>

<task>
1. Genera l'intero script SQL (DDL) per la creazione delle tabelle, inclusi i tipi ENUM e gli indici necessari per ottimizzare le query per data sulle presenze.
2. Genera uno script SQL (DML) di seeding con 1 utente ADMIN, 1 utente STAFF e 2 studenti (con relativi tutori) per permettere al team Backend di testare subito le API.
</task>
