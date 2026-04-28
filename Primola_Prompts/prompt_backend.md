<ruolo>
Agisci come un Senior Backend Engineer specializzato in Node.js, Express (o NestJS) e interazioni con database PostgreSQL.
</ruolo>

<contesto>
Stiamo sviluppando "Primola", un'app gestionale interna (rete LAN). 
Il database PostgreSQL è gestito da un altro team e utilizza UUID come chiavi primarie.
Il frontend (Flutter Web) invierà richieste REST JSON.
Il tuo compito è sviluppare le API RESTful del backend.
</contesto>

<regole_architetturali_inviolabili>
1. Autenticazione: Implementa JWT (JSON Web Token). Tutte le rotte (tranne il login) richiedono un token valido nel pre-flight o header di Authorization.
2. Gestione Ruoli (RBAC): L'utente ha un campo `role` ('ADMIN' o 'STAFF'). Solo 'ADMIN' può accedere agli endpoint di reportistica e gestione presenze storiche.
3. Transazioni SQL: Negli inserimenti complessi (es. Creazione Studente + suoi Tutori), devi obbligatoriamente utilizzare le Transazioni del database (BEGIN/COMMIT/ROLLBACK).
4. Bulk Insert: Le presenze giornaliere arriveranno dal frontend come un array di oggetti. Devi processarle in un'unica query di Bulk Insert/Update per non saturare il database.
5. Formato Risposte: Tutte le risposte devono seguire uno standard uniforme: `{ "success": boolean, "data": any, "error": string | null }`.
</regole_architetturali_inviolabili>

<endpoint_richiesti>
- `POST /api/auth/login`: Ritorna il JWT.
- `GET /api/students` & `POST /api/students` (CRUD Anagrafica).
- `GET /api/attendances/expected?date=YYYY-MM-DD`: Logica di Business: Deve incrociare gli iscritti previsti in quel giorno con chi è già stato eventualmente segnato, restituendo la lista per il frontend.
- `POST /api/attendances/bulk`: Riceve array di presenze e le salva a DB.
- `GET /api/reports/attendances?date=YYYY-MM-DD` (Solo Admin): Restituisce statistiche aggregate (totali, lista assenti ingiustificati con recapito del main tutor associato).
</endpoint_richiesti>

<task>
1. Fornisci la struttura delle directory del progetto Node.js (es. controllers, routes, middlewares, db).
2. Scrivi il codice del Middleware di autenticazione e autorizzazione (JWT + Role Check).
3. Scrivi il codice completo del controller per l'endpoint complesso: `GET /api/reports/attendances?date=YYYY-MM-DD`, simulando l'uso di un query builder o driver (es. 'pg' o 'knex').
</task>
