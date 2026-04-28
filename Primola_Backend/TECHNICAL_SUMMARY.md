# Technical Summary: Primola Backend Implementation

Questo documento riassume le attività di ingegnerizzazione e implementazione del backend Node.js svolte fino ad ora per l'applicazione gestionale "Primola".

## 1. Bootstrap dell'Infrastruttura (Node.js & Express)
- **Inizializzazione Progetto**: Generazione dell'alberatura delle directory (`/src/config`, `/src/controllers`, `/src/middlewares`, `/src/repositories`, `/src/routes`, `/src/utils`).
- **Dependencies Management**: Configurazione del `package.json` con moduli core (`express`, `cors`, `dotenv`, `morgan`), connettore DB (`pg`), auth (`jsonwebtoken`) e tool per documentazione (`swagger-ui-express`, `swagger-jsdoc`). Ambiente di dev gestito tramite `nodemon`.
- **Application Entry Point (`src/index.js`)**: Setup della pipeline dei middleware Express (CORS, JSON body parser, Morgan logger) e mounting ricorsivo dei router. Implementazione di un handler globale degli errori in coda alla chain (`src/middlewares/errorHandler.js`).

## 2. Integrazione Persistenza (PostgreSQL)
- **Connection Pool**: Implementazione di un modulo singleton (`src/config/database.js`) basato su `pg.Pool` per una gestione efficiente delle socket TCP verso PostgreSQL 16 (`postgresql://postgres:postgres@localhost:5432/primola`).
- **Health Check**: Sviluppata la routine asincrona `testConnection()` invocata automaticamente all'avvio del server (`app.listen`) per validare l'handshake col DB emettendo un log esplicito.

## 3. Sicurezza: Autenticazione & Role-Based Access Control (RBAC)
- **JWT Middleware (`src/middlewares/authMiddleware.js`)**: 
  - `verifyToken`: Intercettazione dell'header `Authorization: Bearer <token>`, decodifica sincrona tramite `jsonwebtoken` e injection del payload nel context della request (`req.user`). Gestione puntuale delle eccezioni come `TokenExpiredError`.
  - `requireRole`: Funzione higher-order (closure) per l'implementazione dell'RBAC. Valida che `req.user.role` appartenga all'array di ruoli consentiti fornito al momento del routing.

## 4. API & Standardizzazione Dati
- **Response Wrapper**: Implementazione rigorosa del pattern `{ success: boolean, data: any, error: string | null }` (`src/utils/responseFormat.js`) imposto come contratto architetturale per uniformare il parsing lato frontend.
- **Reports Module (`GET /api/reports/attendances`)**:
  - Restrizione: Solo `ADMIN`.
  - Implementazione controller (`reportController.js`) con esecuzione concorrente di due statement SQL via `Promise.all()`:
    1. Query aggregata (`COUNT(CASE WHEN...)`) per statistiche raw (presenti, assenti, ecc.).
    2. Query complessa (Multi-`LEFT JOIN`) per estrarre la lista delle assenze ingiustificate unitamente ai dati anagrafici del *Main Tutor*.
- **Students Module (`GET /api/students`)**:
  - Restrizione: `ADMIN` o `STAFF`.
  - Architettura a layer con introduzione del `studentRepository.js` (DAO Pattern) che astrae l'accesso al DB eseguendo una query relazionale tra `students`, `student_tutors` e `tutors`.
  - Integrazione col controller dedicato e mounting su Express router.

## 5. Documentazione Interattiva (OpenAPI/Swagger)
- **Setup API Docs**: Integrazione dell'interfaccia Swagger UI esposta su `/api-docs`.
- **Configurazione di Sicurezza Swagger**: Setup dello schema *Bearer Auth* (`http/bearer/JWT`) all'interno di `swagger.js` per permettere l'invocazione manuale delle rotte protette dall'interfaccia.
- **JSDoc Annotation**: Marcatura esplicita delle rotte (`src/routes/reports.js`, `src/routes/students.js`) tramite tag `@swagger` per definire l'I/O schema e mappare gli status code.

## 6. Prompt Engineering per Handoff (Frontend)
- **Generazione Artefatto**: Creazione di `prompt_frontend_integration.md` contenente le istruzioni esplicite da sottoporre all'ambiente di sviluppo Flutter.
- **Contenuti del Prompt**: Dettaglio del Base URL, del Response Contract, istruzioni sull'uso di Interceptors (es. package `dio`) per la serializzazione dell'Authorization header e specifiche di payload per l'ingestion dei modelli Dart.
