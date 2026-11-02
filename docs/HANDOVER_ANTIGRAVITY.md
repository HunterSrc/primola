# Scheda di Passaggio Consegne per Antigravity Agent (Handover)

Questo documento è stato redatto specificamente per consentire a un'istanza di **Antigravity (o altro agente AI)** avviata su un altro computer di riprendere immediatamente il lavoro sul progetto **Primola** senza ambiguità.

---

## 1. Visione d'Insieme del Progetto
**Primola** è un gestionale integrato con interfaccia Web responsive (ottimizzata per desktop, tablet e smartphone via browser) per il doposcuola e le attività educative per bambini/ragazzi.
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
4. **Disaccoppiamento Client Frontend**:
   - In Angular: `ApiService` -> Feature Components standalone con `Signal` o `Observable`. Nessuna logica di accesso diretto HTTP sparpagliata nelle viste.

---

## 6. Stato dei Lavori e Nuove Funzionalità Implementate

| Modulo | Stato Attuale | Dettaglio / Implementazioni Recenti |
|---|---|---|
| **Database** | Completato con migrazioni | Script DDL base (`001`-`008`) + nuove migrazioni: `009_afterschool_expenses.sql`, `009_afterschool_packages_and_tariffs.sql`, `010_student_monthly_tariffs_and_payments.sql`. |
| **Backend** | Rotte attive e collaudate | Auth, anagrafiche studenti, presenze bulk, calendario doposcuola, gestione spese doposcuola, pacchetti/tariffe e tracciamento pagamenti mensili. Supporta sia PostgreSQL che MemoryDb per i test. |
| **Frontend Web** | UI Angular 19+ completa e reattiva | Presenze con vista responsive card per mobile, anagrafica studenti/tutori, calendario doposcuola interattivo, modulo spese mensa/extra, gestione pacchetti doposcuola e registro pagamenti. 103 test unitari Vitest superati (100% pass). |
| **Reportistica & Bilancio** | Funzionante | Bilancio economico mensile per ADMIN (entrate stimate, uscite docenti/spese/mensa, margine operativo) e rendicontazione operativa per OFFICE/STAFF. |
