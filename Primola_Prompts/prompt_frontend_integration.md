<ruolo>
Agisci come un Senior Frontend Engineer specializzato in Flutter e Web Development.
</ruolo>

<contesto>
Stiamo sviluppando "Primola", un'app gestionale interna aziendale. Il backend, realizzato in Node.js ed Express con un database PostgreSQL, è ora in esecuzione e pronto per l'integrazione. L'URL base per le richieste di sviluppo locale è `http://localhost:3000/api`.
Il tuo compito è configurare il layer di rete (networking) del progetto Flutter per far comunicare correttamente l'interfaccia utente con questi endpoint.
</contesto>

<regole_architetturali_inviolabili>
1. **Formato Standard delle Risposte**: Qualsiasi endpoint del backend (sia per chiamate andate a buon fine, sia per errori) restituisce un payload JSON con questa struttura fissa. Il tuo client HTTP dovrà parsare sempre questo wrapper:
   ```json
   {
     "success": boolean,
     "data": any, // I dati effettivi o null in caso di errore
     "error": string | null // Messaggio di errore o null in caso di successo
   }
   ```
2. **Autenticazione JWT**: La maggior parte delle rotte è protetta. Il token JWT ottenuto in fase di login deve essere allegato obbligatoriamente all'header di ogni richiesta come: `Authorization: Bearer <il_tuo_token_jwt>`.
3. **Gestione Errori Globali**: Se l'API restituisce HTTP 401 (Token scaduto o mancante) o 403 (Permessi insufficienti, es. un utente STAFF che cerca di vedere i report), l'app deve gestire correttamente l'eccezione (es. reindirizzamento al login o mostrare un warning all'utente).
</regole_architetturali_inviolabili>

<endpoint_disponibili>
Al momento il backend espone i seguenti endpoint da integrare:

1. **Recupero Studenti e Tutori**
   - **Metodo**: `GET`
   - **Path**: `/api/students`
   - **Auth**: Richiesto JWT (Ruoli: `ADMIN` o `STAFF`)
   - **Response `data`**: Array di oggetti contenenti l'id, nome, cognome dello studente e i dati aggregati del tutore principale.

2. **Report Giornaliero delle Presenze (Solo Admin)**
   - **Metodo**: `GET`
   - **Path**: `/api/reports/attendances`
   - **Query Params**: `date` (formato stringa `YYYY-MM-DD`, es. `2026-04-28`)
   - **Auth**: Richiesto JWT (Ruolo esclusivo: `ADMIN`)
   - **Response `data`**: Un oggetto contenente due proprietà:
     - `statistics`: totalExpected, present, absent, excused.
     - `unjustifiedAbsences`: Lista di studenti assenti con i recapiti del mainTutor.
</endpoint_disponibili>

<task>
1. Configura un HTTP Client robusto in Flutter (ti suggerisco l'utilizzo del pacchetto `dio`).
2. Crea un **Interceptor** per il client che aggiunga automaticamente l'header di Authorization a tutte le chiamate in uscita.
3. Definisci i modelli/classi Dart per effettuare la deserializzazione JSON sicura (sia del wrapper di base `{success, data, error}`, sia dei payload specifici di `Student` e `DailyReport`).
4. Mostra un esempio di classe Repository (es. `StudentRepository` in Dart) che espone un metodo per fare la fetch degli studenti consumando l'endpoint `/api/students` e parsando la risposta.
</task>
