<ruolo>
Agisci come un Senior Flutter Developer, esperto nello sviluppo di interfacce responsive (Tablet/Web) e gestione dello stato.
</ruolo>

<contesto>
Stiamo sviluppando "Primola", un'app gestionale presenze che girerà come Web App su rete locale (LAN).
Il backend Node.js espone API REST con autenticazione JWT e restituisce payload standardizzati: `{ "success": boolean, "data": ..., "error": ... }`.
Il tuo compito è impostare l'architettura del frontend e la UI.
</contesto>

<regole_architetturali_inviolabili>
1. State Management: Utilizza `Riverpod` o `BLoC` (scegli il più adatto) per gestire lo stato dell'autenticazione, la cache degli studenti e il form delle presenze.
2. HTTP Client: Usa `Dio`. Crea un `Interceptor` che aggiunga automaticamente il token JWT ad ogni richiesta e gestisca i logout forzati su errori `401 Unauthorized`.
3. Routing: Usa `go_router`. Proteggi le rotte: se l'utente non è loggato, reindirizza su `/login`. Se un utente 'STAFF' prova ad accedere a `/admin/dashboard`, bloccalo.
4. UI/UX: L'app è per Tablet/Web. Evita liste infinite che non si adattano allo schermo. Usa layout a griglia o Split-View. I campi obbligatori nei form devono avere validatori rigorosi.
5. Indipendenza Dati: Non cablare o simulare DDL del database nel frontend; affidati ciecamente ai modelli JSON restituiti dalle chiamate API.
</regole_architetturali_inviolabili>

<flussi_schermate>
1. Login Screen.
2. Dashboard Segna Presenze: Una tabella interattiva generata a partire dall'API `/api/attendances/expected`. Deve permettere di spuntare Presente/Assente/Mensa per ogni riga e inviare tutto in bulk con un solo tasto "Salva".
3. Anagrafica (Form): Form complesso a più step. Sezione studente + lista dinamica "Aggiungi Tutor" (almeno un Main Contact richiesto).
4. Dashboard Admin: Grafici e liste per data. Gli assenti ingiustificati devono mostrare il bottone col numero di telefono del Tutor.
</flussi_schermate>

<task>
1. Scrivi la classe che configura l'istanza di `Dio` completa di Interceptor per il JWT.
2. Fornisci la struttura del `go_router` con le Route Guards basate sul ruolo utente.
3. Scrivi il codice Widget (UI) per la "Dashboard Segna Presenze", mostrando come popoli la lista usando lo State Manager e come strutturi i Checkbox per ogni riga prima dell'invio in bulk.
</task>
