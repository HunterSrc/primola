<ruolo>
Agisci come un Senior Backend Engineer specializzato in Node.js, Express e PostgreSQL.
</ruolo>

<contesto>
Stiamo completando lo sviluppo di "Primola", un'app gestionale interna (rete LAN). 
Nel backend abbiamo già implementato l'architettura base: Connection Pool (`pg`), middleware JWT per Auth/RBAC, error handling globale e la struttura standard di risposta `{ success, data, error }`. Abbiamo anche le rotte per il recupero di studenti e la reportistica admin.

Ora dobbiamo sviluppare il "cuore operativo" dell'applicazione: la gestione giornaliera delle presenze e il completamento della gestione anagrafica.
</contesto>

<regole_architetturali_inviolabili>
1. **Idempotenza (Upsert)**: La tabella `attendances` su DB ha un vincolo `UNIQUE(student_id, date)`. I salvataggi massivi delle presenze NON devono mai causare errori di chiave duplicata, ma devono aggiornare la riga esistente se l'utente cambia idea durante la giornata.
2. **Transazioni Obbligatorie**: Quando inserisci o modifichi entità collegate (es. uno Studente e i suoi Tutori), devi usare le Transazioni SQL (`BEGIN`, `COMMIT`, `ROLLBACK`) per garantire l'integrità dei dati.
3. **Formato Risposte**: Usa rigorosamente il wrapper standard di progetto `{ "success": boolean, "data": any, "error": string | null }`.
</regole_architetturali_inviolabili>

<task_da_implementare>
Implementa i seguenti moduli e controller, fornendo il codice completo:

1. **Endpoint `GET /api/attendances/expected?date=YYYY-MM-DD`**
   - Logica: Calcola in base alla data fornita quale giorno della settimana è (es. 1=Lunedì).
   - Esegue una query su PostgreSQL filtrando gli studenti in cui il giorno della settimana è presente nell'array `giorni_abbonamento` (sfruttando l'indicizzazione nativa di Postgres, es. tramite l'operatore `@>` o `ANY()`).
   - Restituisce la lista degli studenti attesi per popolare la dashboard frontend.

2. **Endpoint `POST /api/attendances/bulk`**
   - Riceve un array JSON di presenze: `[{student_id, date, is_present, is_absent_justified, canteen_used, is_extra}]`.
   - Utilizza il driver `pg` per comporre ed eseguire un'unica query SQL di tipo **Bulk Insert con Upsert** (`INSERT INTO attendances (...) VALUES (...) ON CONFLICT (student_id, date) DO UPDATE SET ...`). Non eseguire N query in un loop for.

3. **Completamento CRUD Anagrafica (`POST /api/students` e Tutori)**
   - Crea il controller per l'inserimento di un nuovo studente.
   - L'endpoint deve accettare nel payload anche l'array dei tutori.
   - Apri una transazione SQL, inserisci lo studente, ottieni il suo `UUID`, esegui l'inserimento multiplo dei tutori. Fai commit o rollback in caso di eccezione.
</task_da_implementare>
