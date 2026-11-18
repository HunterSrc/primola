# Regole di Progetto per Antigravity Agent - Primola

Questo file viene letto da Antigravity per garantire continuità di standard, sicurezza e architettura nello sviluppo del gestionale **Primola**.

---

## 0. Fonte Autorevole delle Decisioni (`decision.md`)

- Il file [`decision.md`](../decision.md) nella root del repository (`D:\Projects\primola\decision.md`) è il **registro ufficiale e autorevole** delle decisioni architetturali, funzionali, RBAC e di dominio concordate per Primola (**D1–D10**).
- **Regola obbligatoria per tutti gli agenti**:
  1. **Leggere `decision.md`** prima di implementare o modificare qualsiasi flusso applicativo, query, endpoint, controllo RBAC o schermata UI.
  2. **Rispettare integralmente le decisioni D1–D10** documentate in `decision.md` senza reintrodurre logiche deprecate (`doposcuola_daily_fee`, modifica manuale `presenze_pagate`, pre-attivazione pasti da `pasti_settimanali`/`giorni_mensa`, ecc.).
  3. **Aggiornare `decision.md`** contestualmente ogniqualvolta venga presa, estesa o modificata una decisione architetturale o di flusso operativo.

---

## Linee Guida Architetturali

1. **Monorepo Structure**:
   - `decision.md`: Registro delle decisioni architetturali e funzionali (`D1`–`D9`).
   - `Primola_Backend`: Node.js + Express + `pg` + Swagger (supporta PostgreSQL 15/16 e modalità in-memory `pg-mem` tramite `USE_MEMORY_DB=true`).
   - `primola_frontend`: Angular 19+ (Standalone components, Signals/RxJS) + Tailwind CSS + Vitest.
   - `Primola_Backend/db`: Script DDL (`db_schema.sql`), DML di seed (`db_seed.sql`) e migrazioni SQL (`migrations/001`–`010`).
   - `docs/`: Documentazione di business (`ANALISI_FUNZIONALE.md`), DB (`tech_summary_db.md`), manuale d'uso (`manuale_uso/MANUALE_USO.md`) e handover (`HANDOVER_ANTIGRAVITY.md`).

2. **Backend API Standard & Sicurezza**:
   - Envelope obbligatorio per tutte le response: `{ "success": boolean, "data": any, "error": string | null }`.
   - Autenticazione: Header `Authorization: Bearer <JWT>` verificato tramite `verifyToken`.
   - Database: Query SQL parametrizzate; utilizzare transazioni (`BEGIN`/`COMMIT`/`ROLLBACK`) per operazioni su più tabelle (es. studente + tutori); inserimenti/aggiornamenti massivi delle presenze tramite bulk upsert con `ON CONFLICT (student_id, date) DO UPDATE`.

3. **Modello RBAC (`ADMIN`, `OFFICE`, `TEACHER`)**:
   - Il sistema utilizza tre gruppi di accesso (`groups` / `user_groups`): **`ADMIN`**, **`OFFICE`**, **`TEACHER`** (con normalizzazione automatica del ruolo legacy `STAFF` → `TEACHER` in `authMiddleware.js` e `AuthService`).
   - **`ADMIN`**: accesso completo; configurazione esclusiva di `afterschool_packages` / `afterschool_tariffs` (`/api/afterschool-packages`), aggiornamento impostazioni (`PUT /api/settings`), gestione ruoli ed eliminazione utenti/commesse, e accesso esclusivo al Bilancio Economico Mensile (`GET /api/reports/financial-monthly` e route frontend `/admin/dashboard` *"Riepiloghi & Bilancio Admin"*).
   - **`OFFICE`**: gestione operativa completa (anagrafiche studenti/tutori, appello presenze completo inclusa mensa e aggiunta/rimozione studenti via `DELETE /api/attendances/:date/:studentId`, creazione/eliminazione chiusure straordinarie `POST`/`DELETE /api/afterschool/closures`, assegnazioni/turni doposcuola, pacchetti assegnati e saldi su `/api/payments/*`, note spese `/api/afterschool/expenses`, commesse/corsi e reportistica operativa `/reports` *"Rendicontazione Operativa"*).
   - **`TEACHER`**: sola lettura calendario doposcuola/chiusure e propria scheda utente (`PUT /api/users/:id` limitato alla propria anagrafica); escluso dai dati economici/compensi orari tramite `sanitizeTeacherSensitiveData`; sull'Appello Giornaliero (`POST /api/attendances/bulk`) può **solo** modificare `is_present` sugli studenti già presenti nella lista del giorno (vietati modifica di `canteen_used`, aggiunta studenti e rimozione studenti — rif. **D6a**).

4. **Regole di Dominio e Flussi Operativi (D1–D9)**:
   - **Appello Giornaliero, Chiusure & Festività (D1, D5, D6a, D6b, D9)**:
     - `GET /api/attendances/expected` e `/dashboard` pre-caricano automaticamente gli studenti attesi da `giorni_abbonamento` (`EXTRACT(ISODOW FROM date) = ANY(giorni_abbonamento)`, `1=Lunedì..5=Venerdì`) più eventuali studenti extra già presenti in `attendances`.
     - Su `closure_days` (gestibili da `ADMIN` e `OFFICE`) e sulle Festività Nazionali Italiane (fisse + Pasqua/Pasquetta calcolate via `Primola_Backend/src/utils/holidays.js` e `primola_frontend/src/app/core/utils/holidays.util.ts`), gli studenti attesi automatici sono **0** (salvo record manuali già inseriti in `attendances`), e tali date sono escluse dai giorni attesi nei report.
     - Il dropdown docenti per l'assegnazione turni in `/afterschool-calendar` elenca esclusivamente utenti appartenenti al gruppo **`TEACHER`** (allineato a `/api/afterschool/assignments`).
   - **Mensa Cumulativa a Consuntivo (D7)**:
     - I pasti **non** devono mai essere pre-pianificati né pre-attivati da `pasti_settimanali` o `giorni_mensa`.
     - `canteen_used` parte sempre `false` ed è spuntato giornalmente solo da `OFFICE` o `ADMIN`; la rendicontazione è cumulativa a consuntivo mensile.
     - Non esporre *"Pasti Settimanali"* in Anagrafica UI (mantenere solo default `0` nei payload per compatibilità DB) né *"Pasti Previsti"* (`expectedMeals`) nei report o nel calendario.
   - **Tariffe a Pacchetti, Copertura Giorni & Bilancio Economico (D2, D3, D4, D8)**:
     - Il modulo Pacchetti & Pagamenti (`/payments`, `student_monthly_tariffs` + `student_monthly_settlements`) è l'unica fonte di verità per `covered_days` ed `extra_days` (`Math.max(0, days_present - covered_days)`). Non usare né modificare manualmente `presenze_pagate` (`student_monthly_plans`) nei report Admin.
     - Tariffe doposcuola unificate in `afterschool_packages` + `afterschool_tariffs` (`1_DAY_WEEK`..`5_DAYS_WEEK` + `ONE_OFF`). Rimosso `doposcuola_daily_fee` da `system_settings` (dove rimane `meal_fee_student`).
     - Nel Bilancio Economico Mensile (`GET /api/reports/financial-monthly`), esporre e distinguere: `expected` (Maturato/Previsto = pacchetti assegnati o stimati da `giorni_abbonamento.length` + extra maturati `extra_days * ONE_OFF` + pasti consumati `actual_meals * meal_fee_student`), `actual` (Incassato = pacchetti `amount_paid` + extra con `extra_paid = true` + pasti con `meals_paid = true`) e `pending` (Da Incassare = extra con `extra_paid = false` + pasti con `meals_paid = false`).

5. **Frontend Patterns**:
   - Mantenere la separazione tra presentazione e dati (`ApiService` / `AuthService` -> Feature Components Standalone Angular con Signals/RxJS).
   - Gestire sempre il fallback/gestione errori HTTP con feedback chiaro all'utente.
   - Voci di menu reportistica in `MainLayoutComponent` (**D8**): `/reports` → **"Rendicontazione Operativa"** (`OFFICE` + `ADMIN`) e `/admin/dashboard` → **"Riepiloghi & Bilancio Admin"** (solo `ADMIN`).

6. **Ambiente & Credenziali di Sviluppo**:
   - DB PostgreSQL: `postgresql://postgres:postgres@localhost:5432/primola` (oppure `USE_MEMORY_DB=true` per avviare e testare con `pg-mem`).
   - Seed (`Primola_Backend/db/db_seed.sql` / `memoryDb.js`):
     - Admin: `admin@primola.it` / `AdminPrimola2026!`
     - Staff/Teacher (in `db_seed.sql`): `staff@primola.it` / `StaffPrimola2026!`

7. **Politica di Sicurezza Database, Backup Preventivo & Tutela Utenti (D10)**:
   - **Backup Preventivo Obbligatorio**: Prima di applicare qualsiasi migrazione SQL, seed, operazione DDL/DML strutturale o cancellazione dati sul database (locale o remoto), **DEVE SEMPRE** essere eseguito un dump di backup preventivo (`backups/primola_backup_YYYYMMDD_HHmmss.sql`). Gli script di deployment `scripts/deploy.ps1` e `scripts/deploy.sh` invocano automaticamente `Backup-Db` / `backup_db` prima di applicare qualsiasi migrazione con `-Target migrate`.
   - **Tutela Assoluta delle Anagrafiche Utenti**: Gli utenti (`users`, `user_groups`, `groups`) **non devono MAI essere cancellati, troncati o azzerati** durante operazioni di seed o pulizia dati.
   - **Isolamento delle Operazioni di Reset**: Operazioni di reset o rigenerazione dati operativi (es. iscritti, presenze, pasti) devono limitare i comandi `DELETE` unicamente alle tabelle di dominio pertinenti (`students`, `tutors`, `attendances`), lasciando sempre intatto il patrimonio anagrafico degli utenti e dei ruoli RBAC.

8. **Orchestrazione Piani e Sviluppo tramite Swarm**:
   - Ogni volta che viene elaborato un piano di implementazione (`/plan`) e si procede all'esecuzione, **includere sempre nel piano la strategia di esecuzione tramite `swarm`** e utilizzare lo strumento `swarm` per parallelizzare le attività indipendenti (es. Database/Docs, Backend, Frontend, Verifier) ottimizzando i tempi di sviluppo e verifica.
   - **Scelta Modelli nei Worker Swarm**:
     - **Worker di lavorazione/implementazione** (es. `db-docs`, `backend`, `frontend` e tutte le fasi di sviluppo): utilizzare sempre **Hydrogen** (`model: "gemini-4-hydrogen-medium"`).
     - **Worker di verifica** (`verifier`): utilizzare sempre **Flash** (`model: "gemini-3.8-flash-medium"`).

9. **Gestione Versioni & Procedura di Deploy**:
   - A ogni deploy (totale o mirato), **avanzare obbligatoriamente di versione**.
   - **Chiedere SEMPRE all'utente prima del deploy** se si tratta di un rilascio **Minor** (es. da `v2.0` a `v2.1`) o **Major** (es. da `v2.0` a `v3.0`).
   - Aggiornare la versione nei riferimenti del gestionale:
     - Badge versione nella Sidebar UI (`primola_frontend/src/app/layout/main-layout.component.ts`)
     - File di configurazione (`primola_frontend/package.json`, `Primola_Backend/package.json`)
     - Tracciamento nel `CHANGELOG.md` e creazione del relativo git tag.
