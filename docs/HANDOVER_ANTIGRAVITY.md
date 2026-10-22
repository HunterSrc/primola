# Scheda di Passaggio Consegne per Antigravity Agent (Handover)

Questo documento è stato redatto specificamente per consentire a un'istanza di **Antigravity (o altro agente AI)** avviata su un altro computer di riprendere immediatamente il lavoro sul progetto **Primola** senza ambiguità.

---

## 1. Visione d'Insieme del Progetto
**Primola** è un gestionale integrato (desktop web e tablet/mobile) per il doposcuola e le attività educative per bambini/ragazzi.
Le funzionalità cardine sono:
1. **Rilevazione presenze rapida** (griglia giornaliera con filtri studenti attesi per giorno della settimana).
2. **Controllo mensa** (conteggio pasti e rendicontazione periodica catering).
3. **Anagrafica studenti e tutori** (gestione piani settimanali e contatti di emergenza).
4. **Reportistica amministrativa** (KPI presenze, tasso di affluenza, elenco assenze ingiustificate con chiamata diretta al genitore).

---

## 2. Struttura del Monorepo

```text
primola/
├── Primola_Backend/         # REST API Node.js / Express / PostgreSQL 16
│   ├── db/                  # Script SQL DDL e Seed (db_schema.sql, db_seed.sql)
│   ├── src/
│   │   ├── config/          # Pool PostgreSQL (pg.Pool singleton)
│   │   ├── controllers/     # Controller rotte (auth, students, attendance, reports)
│   │   ├── middlewares/     # JWT verification, RBAC (requireRole), error handling
│   │   ├── repositories/    # Query SQL parametrizzate e DAO
│   │   └── routes/          # Express Routers con documentazione JSDoc Swagger
│   └── swagger.js           # Setup Swagger UI (/api-docs)
├── primola_frontend/        # Web App Standalone Angular 19+ / Tailwind CSS / Vitest
│   └── src/app/
│       ├── core/            # AuthService, JwtInterceptor, AuthGuard, AdminGuard
│       └── features/        # Moduli: attendance (presenze), anagrafica (studenti/tutori), admin (report)
├── primola_app/             # Mobile/Tablet Client Flutter (Android, iOS, Web, Desktop)
│   └── lib/
│       ├── core/            # ApiClient (Dio), Interceptors JWT, ApiResponse<T>
│       └── features/        # State management Riverpod (StateNotifier), GoRouter, Repository pattern
├── docs/                    # Documentazione consolidata di progetto
│   ├── ANALISI_FUNZIONALE.md # Processi di business dettagliati
│   ├── tech_summary_db.md    # Specifiche database e indici GIN
│   └── legacy_prompts/       # Storico prompt di bootstrap
└── .gemini/                 # Istruzioni e regole persistenti per Antigravity Agent
```

---

## 3. Ambiente di Sviluppo & Prerequisiti

### Requisiti di Sistema
- **Node.js**: v18+ o v20+
- **PostgreSQL**: 15 o 16 (in ascolto su `localhost:5432`)
- **Flutter SDK**: 3.x+ (se si lavora sul client mobile/tablet)
- **Git**

### Credenziali Predefinite di Seed
- **DB PostgreSQL**: `postgres:postgres@localhost:5432/primola`
- **Utenze Applicative (generate da `db_seed.sql`)**:
  - **Admin**: `username: admin` | `password: admin123` (Ruolo `ADMIN`)
  - **Staff**: `username: staff` | `password: staff123` (Ruolo `STAFF`)

---

## 4. Guida Rapida di Avvio

### A. Setup Database
```bash
createdb primola
psql -d primola -f Primola_Backend/db/db_schema.sql
psql -d primola -f Primola_Backend/db/db_seed.sql
```

### B. Avvio Backend Node.js
```bash
cd Primola_Backend
npm install
npm run dev
# Server in ascolto su http://localhost:3000
# Swagger API docs su http://localhost:3000/api-docs
```

### C. Avvio Frontend Angular
```bash
cd primola_frontend
npm install
npm start
# Web app su http://localhost:4200
```
*Nota*: `primola_frontend` possiede test unitari configurati con Vitest (`npm test`).

### D. Avvio App Flutter
```bash
cd primola_app
flutter pub get
flutter run -d chrome  # oppure emulatore / dispositivo connesso
```

---

## 5. Regole Architetturali e Convenzioni da Mantenere

1. **Formato Risposte API**:
   Ogni endpoint REST deve sempre aderire al contratto:
   ```json
   {
     "success": true,
     "data": { ... },
     "error": null
   }
   ```
2. **Sicurezza e Ruoli (RBAC)**:
   - I ruoli sono unicamente due: `ADMIN` e `STAFF`.
   - Rotte di reportistica, quadratura mensa e audit avanzato sono riservate al ruolo `ADMIN`.
   - L'accesso al DB avviene con query parametrizzate per prevenire SQL injection.
3. **Database & Giorni Settimanali**:
   - I giorni settimanali sono memorizzati come array di interi `SMALLINT[]` (`1=Lunedì, ..., 5=Venerdì`).
   - Gli indici PostgreSQL sono indicizzati con GIN operator classes (`USING gin (giorni_abbonamento)`).
   - Inserimenti di presenze usano `ON CONFLICT (student_id, date) DO UPDATE` per supportare il bulk upsert idempotente.
4. **Disaccoppiamento Client**:
   - In Flutter: `ApiClient` (Dio con interceptor JWT) -> `Repository` -> Riverpod `StateNotifier` -> View (`ConsumerWidget`). Nessuna chiamata HTTP diretta nelle viste.
   - In Angular: `ApiService` -> Feature Components standalone con `Signal` o `Observable`.

---

## 6. Stato dei Lavori e Prossime Implementazioni

| Modulo | Stato Attuale | Prossimi Passi per il Nuovo Agente |
|---|---|---|
| **Database** | Completato e convalidato | Eventuali migrazioni per gestione pagamenti / tariffe quote extra se richieste. |
| **Backend** | Rotte auth, students, attendances bulk, reports completate con Swagger | Aggiungere endpoint per modifica anagrafica studente esistente (`PUT /api/students/:id`) e cancellazione logica. |
| **Frontend Web** | UI presenze, anagrafica tutori, dashboard admin con KPI e chiamate tutori funzionanti | Verificare sincronizzazione con endpoint di modifica anagrafica studente. |
| **App Flutter** | Architettura Riverpod e GoRouter completata, mockup UI presenze predisposta | Collegare l'`AttendanceNotifier` al repository reale (attualmente usa mock data) per completare il parity con il frontend web. |
