# Regole di Progetto per Antigravity Agent - Primola

Questo file viene letto da Antigravity per garantire continuità di standard e architettura nello sviluppo del gestionale Primola.

## Linee Guida Architetturali

1. **Monorepo Structure**:
   - `Primola_Backend`: Node.js + Express + `pg` + Swagger.
   - `primola_frontend`: Angular 19 (Standalone components) + Tailwind CSS + Vitest.
   - `primola_app`: Flutter (Dart) + Riverpod 2.6 + Dio + GoRouter.
   - `Primola_Backend/db`: Script DDL (`db_schema.sql`) e DML di seed (`db_seed.sql`).
   - `docs/`: Documentazione di business (`ANALISI_FUNZIONALE.md`), DB (`tech_summary_db.md`) e handover (`HANDOVER_ANTIGRAVITY.md`).

2. **Backend API Standard**:
   - Envelope obbligatorio per tutte le response: `{ "success": boolean, "data": any, "error": string | null }`.
   - Autenticazione: Header `Authorization: Bearer <JWT>`.
   - RBAC: `ADMIN` o `STAFF`. Proteggi gli endpoint di reportistica con il middleware `requireRole(['ADMIN'])`.
   - Database: Utilizzare transazioni (`BEGIN`/`COMMIT`/`ROLLBACK`) per operazioni su più tabelle (es. studente + tutori).
   - Inserimenti di presenze: usare query di bulk upsert con `ON CONFLICT (student_id, date) DO UPDATE`.

3. **Frontend & Mobile Patterns**:
   - Mantenere la separazione tra presentazione e dati (Repository pattern sia in Angular che in Flutter Riverpod).
   - Gestire sempre il fallback/gestione errori HTTP con feedback all'utente.
   - L'applicazione gestisce presenze attese in base al giorno della settimana (`1=Lunedì, ..., 5=Venerdì`), spunta mensa, assenza giustificata e studenti extra fuori abbonamento.

4. **Credenziali di Sviluppo**:
   - DB: `postgresql://postgres:postgres@localhost:5432/primola`
   - Admin: `admin` / `admin123`
   - Staff: `staff` / `staff123`
