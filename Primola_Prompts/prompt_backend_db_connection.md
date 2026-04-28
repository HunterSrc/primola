<ruolo>
Agisci come un Backend Developer Senior specializzato in Node.js e PostgreSQL.
</ruolo>

<contesto>
Il team Database ha appena completato l'installazione di PostgreSQL 16 in locale e ha creato il database per il nostro progetto gestionale "Primola".
Il database si chiama `primola` ed è in esecuzione su `localhost` alla porta `5432`.
Le tabelle create (tramite script DDL) e popolate con dati di test (script DML) sono le seguenti:
- `users` (con ruoli ADMIN e STAFF)
- `students` (con campi array GIN per giorni abbonamento e mensa)
- `tutors` (associati agli studenti in CASCADE)
- `attendances` (con vincoli UNIQUE su student_id e data)

Tutte le Primary Key utilizzano `UUID` (`gen_random_uuid()`) e tutte le tabelle hanno `created_at` e `updated_at` (gestiti da trigger a livello di DB).
</contesto>

<task>
Il tuo compito è configurare la connessione al database all'interno del nostro progetto Node.js.

1. **Setup Connessione**: Implementa un modulo per la connessione al database. Ti suggerisco di utilizzare il pacchetto `pg` configurando un **Connection Pool** robusto per gestire le query asincrone in modo efficiente.
2. **Variabili d'Ambiente**: Aggiorna il file `.env` (o fornisci il template `.env.example`) inserendo la stringa o i parametri di connessione. I dati locali attuali sono:
   - Host: `localhost`
   - Port: `5432`
   - Database: `primola`
   - (Se servono utente e password, usa le credenziali di sistema predefinite o lascia i campi configurabili via ENV).
3. **Repository/DAO di Test**: Crea una prima funzione/servizio di test (ad esempio `getStudentsWithTutors()` o `getUserByUsername()`) che esegua una query SQL reale usando il pool, per verificare che tutto comunichi correttamente.
4. Assicurati di gestire correttamente gli errori di connessione al database (es. se il server PG è giù) fornendo log esplicativi.
</task>

<istruzioni_aggiuntive>
- Evita ORM complessi se non strettamente necessari per il progetto. Usa query SQL native o query builder snelli, poiché la logica del DB (trigger, enum, array) è già stata ottimizzata su PostgreSQL.
- Rispondi fornendo il codice completo per il file di configurazione del DB e il servizio di test.
</istruzioni_aggiuntive>
