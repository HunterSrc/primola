<ruolo>
Agisci come un Senior Flutter Developer, esperto in Riverpod, Dio e UI/UX responsiva (Web/Tablet).
</ruolo>

<contesto>
Stiamo completando lo sviluppo di "Primola", un'app gestionale presenze (Flutter Web). 
Abbiamo già strutturato il framework di base: `go_router` con RBAC, `Dio` con interceptor JWT, i modelli base e il wrapper per la decodifica delle API (`ApiResponse<T>`). Al momento la dashboard presenze utilizza dati mockati nell'`AttendanceNotifier`.

Il tuo obiettivo è rimuovere i mock data, connettere l'app alle vere API del backend e completare le sezioni UI mancanti (Anagrafica e funzionalità avanzate).
</contesto>

<regole_architetturali_inviolabili>
1. **Zero Mock Data**: Nessuno stato (StateProvider/StateNotifier) deve generare dati finti. Tutti i dati devono fluire dal Backend.
2. **State Management Preciso**: Durante le chiamate asincrone (fetch API o bulk update), gestisci correttamente gli stati `AsyncLoading`, `AsyncData` e `AsyncError` (se usi `AsyncValue` di Riverpod) o mostra loader espliciti in UI per inibire doppi click.
3. **Validazione Rigida**: I form anagrafici non devono consentire submit se i campi obbligatori (Nome, Cognome, Data, ecc.) sono vuoti o invalidi. Lo studente deve avere obbligatoriamente almeno un tutor segnato come "Main Contact".
</regole_architetturali_inviolabili>

<task_da_implementare>
Implementa i seguenti widget e logiche, fornendo il codice Flutter completo:

1. **Cablaggio Reale Dashboard Presenze**
   - Rimuovi i dati mockati. Esegui la chiamata `GET /api/attendances/expected?date=YYYY-MM-DD` usando la tua istanza `Dio` per popolare l'elenco della giornata.
   - Aggiorna la logica del bottone "Salva": deve raccogliere le righe modificate nello stato (presenze, assenze, mensa) e inviare un array via `POST /api/attendances/bulk`. Gestisci il loader e mostra una `SnackBar` di successo o errore.

2. **Funzione "Aggiungi Extra" (UI e Logica)**
   - Nella schermata presenze, aggiungi un bottone "Aggiungi Presenza Extra".
   - Al click, si apre un Modale o BottomSheet che carica la lista globale di tutti gli studenti (usando l'API `GET /api/students`).
   - Cliccando su uno studente, viene aggiunto alla lista della giornata attuale con il flag `is_extra = true` nello stato locale, pronto per essere salvato in bulk.

3. **Sviluppo UI Form Anagrafica (Multistep o Form Flessibile)**
   - Crea un `StatefulWidget` o `HookWidget` complesso per registrare un nuovo studente.
   - Includi i selettori a checkbox per i `giorni_abbonamento` e `giorni_mensa`.
   - Implementa una sezione dinamica "Aggiungi Tutor" (permette di aggiungere dinamicamente campi per 1 o più tutori prima del salvataggio).

4. **Integrazione `url_launcher` in Dashboard Admin**
   - Nella vista report degli assenti ingiustificati (solo Admin), abbiamo a disposizione il numero di telefono del Tutor principale.
   - Implementa un bottone o rendi il numero cliccabile usando il package `url_launcher`: `launchUrl(Uri.parse('tel:$phoneNumber'))`.
</task_da_implementare>
