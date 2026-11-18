# Registro delle Decisioni Architetturali e Funzionali — Primola

> **Fonte Autorevole (Single Source of Truth)**: Questo documento raccoglie le decisioni architetturali, di dominio, RBAC e di flusso operativo concordate per il gestionale **Primola** (`Primola_Backend`, `primola_frontend`, Database PostgreSQL / `pg-mem`).
> In conformità a [`.gemini/rules.md`](.gemini/rules.md), ogni agente o sviluppatore deve consultare questo registro prima di modificare flussi o permessi e aggiornarlo contestualmente a qualsiasi nuova decisione progettuale.

---

## Indice Riepilogativo (D1–D10)

| ID | Titolo | Ambito Principale | Stato |
|---|---|---|---|
| **D1** | Appello Giornaliero & Pre-caricamento Attesi | Backend Attendances + Frontend `/dashboard` | Approvata |
| **D2** | Fonte Unica Copertura Giorni Mensili | Pagamenti `/payments` + Report Mensile Admin | Approvata |
| **D3** | Unificazione Listino Tariffe Doposcuola | `afterschool_packages` + `system_settings` | Approvata |
| **D4** | Bilancio Economico Mensile — Previsto vs Incassato vs Pending | Report Finanziario `/admin/dashboard` | Approvata |
| **D5** | Chiusure Straordinarie & Festività Nazionali | Calendario, Appello, Reportistica | Approvata |
| **D6a** | Permessi `TEACHER` su Appello | RBAC Backend & Frontend `/dashboard` | Approvata |
| **D6b** | Permessi `OFFICE` su Chiusure Straordinarie | RBAC Backend & Frontend `/afterschool-calendar` | Approvata |
| **D7** | Mensa Cumulativa a Consuntivo | Appello, Anagrafica, Calendario, Report | Approvata |
| **D8** | Menu Reportistica | Sidebar Navigation & Access Guards | Approvata |
| **D9** | Turni Doposcuola solo per gruppo `TEACHER` | Calendario Doposcuola & Assegnazioni | Approvata |
| **D10** | Backup Preventivo Automatico e Tutela Utenti | Database, Deploy & Script di Migrazione | Approvata |

---

## D1 — Appello Giornaliero & Pre-caricamento Attesi

### Decisione
1. L'endpoint `GET /api/attendances/expected?date=YYYY-MM-DD` e la pagina frontend `/dashboard` (**"Segna Presenze"**) devono **pre-caricare automaticamente** gli studenti attesi per la data selezionata in base al piano di abbonamento settimanale:
   - Condizione di attesa su `students.giorni_abbonamento`: `EXTRACT(ISODOW FROM $1::date) = ANY(s.giorni_abbonamento)` (`1 = Lunedì ... 5 = Venerdì`).
   - Inclusione tramite `LEFT JOIN attendances a ON s.id = a.student_id AND a.date = $1` di eventuali **studenti extra** già registrati in `attendances` per quella data (`OR a.id IS NOT NULL`), garantendo piena coerenza con il Calendario Settimanale (`/afterschool-calendar`).
   - Nei giorni di chiusura straordinaria o festività nazionale italiana si applica la priorità definita in **D5** (pre-caricamento automatico azzerato; restano visibili solo gli studenti già registrati in `attendances` per quella data).
2. Gli utenti `OFFICE` e `ADMIN` possono **rimuovere permanentemente** uno studente dall'appello di una specifica data tramite l'endpoint:
   - `DELETE /api/attendances/:date/:studentId` (protetto da `verifyToken`, `requireRole(['ADMIN', 'OFFICE'])`).
   - Lato frontend: `ApiService.deleteAttendance(date, studentId)` invocato da `AttendanceDashboardComponent.removeStudent(studentId)`.

### Riferimenti Tecnici
- Backend: `Primola_Backend/src/repositories/attendanceRepository.js`, `attendanceController.js`, `routes/attendances.js`.
- Frontend: `primola_frontend/src/app/core/services/api.service.ts`, `features/attendance/attendance-dashboard.component.ts`.

---

## D2 — Fonte Unica Copertura Giorni Mensili

### Decisione
1. Il sistema **Pacchetti & Pagamenti** (route `/payments`, API `/api/payments/*`, tabelle `student_monthly_tariffs` e `student_monthly_settlements`) costituisce l'**unica fonte di verità** per:
   - **Giorni coperti (`covered_days`)**: somma dei `covered_days` dei pacchetti assegnati allo studente nel mese/anno di riferimento in `student_monthly_tariffs`.
   - **Giorni extra (`extra_days`)**: calcolati automaticamente come `Math.max(0, days_present - covered_days)`.
2. È **rimossa** la modifica manuale di `presenze_pagate` (`student_monthly_plans`) dal Report Mensile Admin (`/admin/dashboard`, tab *Andamento Mensile*):
   - Il backend (`GET /api/reports/monthly`) legge i giorni coperti aggregando `COALESCE(SUM(covered_days), 0)` da `student_monthly_tariffs` per `(year, month)`.
   - La UI mostra il valore in sola lettura con etichetta **"Giorni Coperti (Pacchetti)"** e calcola l'eccedenza automaticamente con `Math.max(0, days_present - presenze_pagate)`.

### Riferimenti Tecnici
- Database: `student_monthly_tariffs`, `student_monthly_settlements`.
- Backend: `Primola_Backend/src/controllers/reportController.js` (`getMonthlyReport`), `repositories/paymentRepository.js`.
- Frontend: `primola_frontend/src/app/features/admin/admin-dashboard.component.ts`, `features/payments/payments-dashboard.component.ts`.

---

## D3 — Unificazione Listino Tariffe Doposcuola

### Decisione
1. La chiave `doposcuola_daily_fee` viene **rimossa** dalla UI e dalla logica di calcolo basata su `system_settings` (inclusa la rimozione del relativo input dal modal *"Tariffe Economiche Primola"* in `/admin/dashboard`).
2. Il listino unico ufficiale delle tariffe doposcuola è gestito esclusivamente tramite `afterschool_packages` e `afterschool_tariffs` (pagina `/admin/afterschool-packages`, API `/api/afterschool-packages`):
   - Pacchetti abbonamento settimanali: `1_DAY_WEEK`, `2_DAYS_WEEK`, `3_DAYS_WEEK`, `4_DAYS_WEEK`, `5_DAYS_WEEK`.
   - Tariffa singola / giorno extra: `ONE_OFF`.
   - Storico tariffe a validità temporale (`valid_from` .. `valid_to`).
3. In `system_settings` viene mantenuta la configurazione di **`meal_fee_student`** (€ / pasto addebitato allo studente). Il costo mensa fornitore è invece rilevato esclusivamente tramite le note spese reali (`afterschool_expenses` con `category = 'MENSA'`), senza tariffa fissa `meal_cost_provider`.

### Riferimenti Tecnici
- Database: `afterschool_packages`, `afterschool_tariffs`, `system_settings` (`meal_fee_student`).
- Backend: `Primola_Backend/src/controllers/reportController.js`, `repositories/afterschoolPackageRepository.js`.
- Frontend: `primola_frontend/src/app/features/admin/admin-dashboard.component.ts`, `features/admin/afterschool-packages-page.component.ts`.

---

## D4 — Bilancio Economico Mensile — Previsto vs Incassato vs Pending

### Decisione
Nel Report Finanziario Mensile (`GET /api/reports/financial-monthly?year=YYYY&month=MM`) e nella scheda *"Bilancio Economico"* di `/admin/dashboard` (oggetto `doposcuola.revenues`), le tre componenti economiche sono calcolate come segue:

1. **`expected` (Maturato / Previsto)**:
   - Somma dei pacchetti assegnati agli studenti nel mese (`student_monthly_tariffs.amount_paid`); per gli studenti che non hanno ancora un pacchetto assegnato nel mese, si usa la stima basata sulla tariffa attiva del pacchetto corrispondente al numero di giorni di abbonamento (`giorni_abbonamento.length` tra `1..5`, codici `1_DAY_WEEK`..`5_DAYS_WEEK`).
   - `+` giorni extra maturati: `extra_days * ONE_OFF` (dove `extra_days = Math.max(0, days_present - covered_days)`).
   - `+` pasti consumati maturati: `actual_meals * meal_fee_student`.
2. **`actual` (Incassato)**:
   - Pacchetti pagati (`SUM(amount_paid)` da `student_monthly_tariffs`).
   - `+` giorni extra effettivamente saldati (`student_monthly_settlements.extra_paid = true`).
   - `+` pasti effettivamente saldati (`student_monthly_settlements.meals_paid = true`).
3. **`pending` (Da Incassare)**:
   - Giorni extra maturati non ancora saldati (`extra_paid = false`).
   - `+` pasti consumati non ancora saldati (`meals_paid = false`).

### Riferimenti Tecnici
- Backend: `Primola_Backend/src/controllers/reportController.js` (`getFinancialMonthlyReport`, includendo la corretta valorizzazione di `totalActualStudentDays`).
- Frontend: `primola_frontend/src/app/core/models/index.ts` (`FinancialMonthlyReport`), `features/admin/admin-dashboard.component.ts`.

---

## D5 — Chiusure Straordinarie & Festività Nazionali

### Decisione
1. Sulle date registrate in `closure_days` e sulle **Festività Nazionali Italiane** — festività fisse (`01-01`, `01-06`, `04-25`, `05-01`, `06-02`, `08-15`, `11-01`, `12-08`, `12-25`, `12-26`) più Domenica di Pasqua e Lunedì dell'Angelo / Pasquetta (algoritmo di Butcher-Meeus):
   - Gli **studenti attesi automatici sono 0** sia in `/afterschool-calendar` (`GET /api/afterschool/week-summary`) che in `/dashboard` (`GET /api/attendances/expected`), **salvo** gli studenti aggiunti manualmente tramite record già presente in `attendances` per quella data.
   - Tali date sono **escluse** dal calcolo dei giorni/presenze attesi nei report giornalieri e mensili (`getDailyReport`, `getFinancialMonthlyReport`).
2. La logica di calcolo delle festività è condivisa in modo coerente tra frontend (`holidays.util.ts`) e backend (`src/utils/holidays.js` con `getItalianHoliday(dateStr)` e `isItalianHoliday(dateStr)`).

### Riferimenti Tecnici
- Backend: `Primola_Backend/src/utils/holidays.js`, `repositories/attendanceRepository.js`, `controllers/afterschoolController.js`, `controllers/reportController.js`.
- Frontend: `primola_frontend/src/app/core/utils/holidays.util.ts`, `features/afterschool/afterschool-calendar.component.ts`, `features/attendance/attendance-dashboard.component.ts`.

---

## D6 — Permessi Operativi RBAC (D6a & D6b)

### D6a — Permessi `TEACHER` su Appello
- Gli utenti appartenenti esclusivamente al gruppo `TEACHER` (senza `ADMIN` né `OFFICE`) possono **unicamente** modificare lo stato di presenza `is_present` (**Presente / Assente**) sugli studenti già elencati nell'appello del giorno.
- Le operazioni su **`canteen_used` (Mensa)** e l'**aggiunta o rimozione** di studenti nella lista giornaliera sono strettamente riservate ai ruoli **`OFFICE` e `ADMIN`**.
- Lato backend: `attendanceController.bulkUpsert` filtra gli aggiornamenti ai soli studenti già attesi/registrati per la data e preserva il valore esistente di `canteen_used` quando il chiamante è solo `TEACHER`; `DELETE /api/attendances/:date/:studentId` richiede `requireRole(['ADMIN', 'OFFICE'])`.
- Lato frontend: `AuthService` controlla tali permessi tramite `canManageAttendanceStudents` e `canManageAttendanceMeals` (`isAdmin() || isOffice()`).

### D6b — Permessi `OFFICE` su Chiusure Straordinarie
- Sia **`ADMIN`** che **`OFFICE`** possono creare ed eliminare le giornate di chiusura straordinaria (`closure_days`).
- Backend: `POST /api/afterschool/closures` e `DELETE /api/afterschool/closures/:id` in `routes/afterschool.js` utilizzano `requireRole(['ADMIN', 'OFFICE'])` (gli utenti solo `TEACHER` ricevono `403 Forbidden`).
- Frontend: in `/afterschool-calendar`, il pulsante **"Chiusure"**, la modale di gestione chiusure e il pulsante di eliminazione chiusura utilizzano `canEdit()` (`isAdmin() || isOffice()`).

---

## D7 — Mensa Cumulativa a Consuntivo

### Decisione
1. I pasti **non** sono pre-pianificati né pre-attivati automaticamente dai campi `students.pasti_settimanali` o `students.giorni_mensa`.
2. Giornalmente, il personale `OFFICE` o `ADMIN` segna chi usufruisce della mensa (`canteen_used = true`, con valore predefinito sempre `false` sia negli attesi che nei nuovi inserimenti manuali).
3. I pasti vengono conteggiati **cumulativamente a consuntivo** a fine mese (`COUNT(CASE WHEN canteen_used = true THEN 1 END)`) per la rendicontazione mensa, il bilancio economico e il saldo in `/payments`.
4. Pulizia UI / Reportistica:
   - Rimozione della colonna/badge e dei campi **"Pasti Settimanali"** dall'Anagrafica Studenti (`/anagrafica` e `/anagrafica/:id/edit`), mantenendo i default `weekly_meals: 0` / `pasti_settimanali: 0` nei payload per compatibilità con i vincoli DB esistenti.
   - Rimozione di **"Pasti Previsti"** (`expectedMeals` / `expected_meals`) dai report (`/admin/dashboard` tab *Rendiconto Mensa*, `/afterschool-expenses`) e dalle viste/modali di `/afterschool-calendar` e `/dashboard`.

### Riferimenti Tecnici
- Backend: `attendanceRepository.js`, `afterschoolRepository.js`, `afterschoolController.js`, `reportController.js`.
- Frontend: `anagrafica.component.ts`, `student-edit.component.ts`, `attendance-dashboard.component.ts`, `afterschool-calendar.component.ts`, `admin-dashboard.component.ts`, `afterschool-expenses.component.ts`.

---

## D8 — Menu Reportistica

### Decisione
Vengono mantenute due viste di reportistica distinte per perimetro operativo ed economico, con aggiornamento delle voci nella sidebar (`MainLayoutComponent`):
1. **`/reports`** — accessibile a **`OFFICE` + `ADMIN`** (`reportsGuard`, API `/api/reports/operational-monthly`, `/api/reports/projects`, ecc.):
   - Rinominata nel menu laterale in **`"Rendicontazione Operativa"`**.
2. **`/admin/dashboard`** — accessibile **solo ad `ADMIN`** (`adminGuard`, API `/api/reports/financial-monthly` e riepiloghi avanzati):
   - Rinominata nel menu laterale in **`"Riepiloghi & Bilancio Admin"`**.

---

## D9 — Turni Doposcuola solo per gruppo `TEACHER`

### Decisione
Il menu a tendina per la selezione dell'insegnante nei turni doposcuola in `/afterschool-calendar` (`AfterschoolCalendarComponent.loadTeachers()`) deve elencare **esclusivamente** gli utenti appartenenti al gruppo **`TEACHER`**, in piena coerenza con il vincolo applicato dal backend sull'endpoint `/api/afterschool/assignments` (che accetta solo utenti con gruppo `TEACHER`).

---

## D10 — Backup Preventivo Automatico e Tutela Anagrafiche Utenti

### Decisione
1. **Backup Preventivo Obbligatorio**:
   - Qualsiasi operazione di migrazione SQL, seed, ripristino o manipolazione strutturale del database (sia in ambiente locale che su server remoto) **deve tassativamente generare un backup preventivo completo** del database attuale.
   - I backup sono salvati in formato dump SQL con timestamp univoco (`backups/primola_backup_YYYYMMDD_HHmmss.sql`).
   - Gli script di automazione (`scripts/deploy.ps1` e `scripts/deploy.sh`) sono strutturati per eseguire automaticamente `Backup-Db` / `backup_db` prima di procedere all'applicazione di qualsiasi file di migrazione SQL con `-Target migrate`. Se il backup fallisce, la migrazione viene interrotta immediatamente per prevenire perdite di dati.
2. **Tutela Inviolabile delle Anagrafiche Utenti**:
   - Gli utenti (`users`, `user_groups`, `groups`) costituiscono dati persistenti protetti e **non devono mai essere cancellati, sovrascritti o azzerati** durante operazioni di seed o pulizia dati.
   - Ogni script di rigenerazione o aggiornamento deve operare selettivamente solo sulle tabelle di dominio specifico (es. `students`, `tutors`, `attendances`), preservando la continuità di accesso e i ruoli RBAC di sistema.

### Riferimenti Tecnici
- Script: `scripts/deploy.ps1` (`Backup-Db`, `Run-Migration`), `scripts/deploy.sh` (`backup_db`, `run_migration`).
- Directory: `backups/`.
- Regole di Progetto: `.gemini/rules.md`.
