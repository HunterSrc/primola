# Primola - Sistema Gestionale Presenze & Doposcuola

**Primola** è una piattaforma software full-stack concepita per la gestione integrata delle attività educative e di doposcuola, con focus specifico su:
1. Tracciamento rapido delle presenze giornaliere degli studenti.
2. Monitoraggio delle presenze al servizio mensa.
3. Gestione centralizzata dell'anagrafica studenti e dei contatti tutori/genitori.
4. Generazione di reportistica amministrativa (assenze ingiustificate, report mensa per rendicontazione fornitori/catering).

---

## 1. Architettura del Progetto

Il repository include i diversi moduli del sistema:

```text
primola/
├── Primola_Backend/         # REST API Node.js (Express, PostgreSQL, Swagger)
├── primola_frontend/        # Web App moderna in Angular 19+ (Tailwind CSS, Vitest)
├── primola_app/             # Client Mobile/Tablet in Flutter (Dart, Riverpod, Dio)
└── Primola_Prompts/         # Script SQL DDL/DML e specifiche architetturali
```

### Componenti Principali

| Modulo | Tecnologia | Ruolo e Funzionalità Principali |
|---|---|---|
| **Database** | PostgreSQL 16 | Relazionale, DDL con trigger per `updated_at`, indici GIN per array giorni (`giorni_abbonamento`, `giorni_mensa`), vincolo `UNIQUE(student_id, date)`. |
| **Backend** | Node.js, Express, `pg` | API REST, sicurezza JWT con Role-Based Access Control (`ADMIN`, `STAFF`), documentazione interattiva OpenAPI/Swagger UI (`/api-docs`). |
| **Frontend Web** | Angular 19+, Tailwind CSS | Interfaccia desktop/web responsiva: segna presenze con filtri rapidi e bulk save, anagrafica completa con tutori dinamici, dashboard amministrativa con reportistica. |
| **App Mobile/Tablet** | Flutter, Riverpod, Dio, GoRouter | Client cross-platform tablet/mobile per gli operatori in sede: layout responsive, gestione sessione JWT, repository disaccoppiati e dashboard presenze reattiva. |

---

## 2. Stato di Avanzamento Attuale

### Database (`Primola_Prompts/db_schema.sql` e `db_seed.sql`)
- [x] Schema DDL completo con tabelle: `users`, `students`, `tutors`, `attendances`.
- [x] Indici GIN performanti per le ricerche sui giorni della settimana (`SMALLINT[]`).
- [x] Trigger `BEFORE UPDATE` automatici per l'aggiornamento dei timestamp.
- [x] Script di seed con utenti (`admin`, `staff`), anagrafica fittizia e storico presenze.

### Backend (`Primola_Backend`)
- [x] Architettura a layer (Routes, Controllers, Repositories/DAO, Middlewares).
- [x] Connessione a PostgreSQL tramite pool singleton (`pg.Pool`) con health check.
- [x] Autenticazione JWT e middleware di autorizzazione RBAC (`verifyToken`, `requireRole`).
- [x] Endpoints API implementati:
  - `GET /api/students` & `POST /api/students` (gestione anagrafica e tutori).
  - `GET /api/attendances/expected` (calcolo presenze attese in base al giorno della settimana).
  - `POST /api/attendances/bulk` (salvataggio massivo / upsert presenze).
  - `GET /api/reports/attendances` (statistiche giornaliere e lista assenze ingiustificate con contatti tutori).
  - `GET /api/reports/mensa` (conteggio e storico pasti consumati per range date).
- [x] Swagger UI interattivo esposto su `http://localhost:3000/api-docs` con supporto Bearer Token.

### Frontend Web Angular (`primola_frontend`)
- [x] Stack standalone con Angular 19, TypeScript e Tailwind CSS.
- [x] Routing con AuthGuard e AdminGuard (separazione ruoli `ADMIN` e `STAFF`).
- [x] Interceptor HTTP automatico per inserimento Bearer Token.
- [x] **Sezione Segna Presenze**:
  - Selezione data di rilevazione.
  - Elenco dinamico studenti attesi per quel giorno.
  - Spunte per Presenza, Assenza Giustificata, Mensa, Fuori Abbonamento (Extra).
  - Aggiunta al volo di studenti non schedulati (studenti extra).
  - Azioni rapide (Tutti Presenti, Segna Tutti Mensa, Reset).
  - Salvataggio massivo (`bulk save`) con fallback mock trasparente in caso di backend offline.
- [x] **Sezione Anagrafica Studenti**:
  - Creazione guidata studente con selezione orari/giorni settimanali (Lunedì-Venerdì) e mensa.
  - Gestione dinamica dei tutori (aggiunta/rimozione contatti, selezione tutore principale).
  - Elenco degli iscritti con ricerca live per nome o scuola.
- [x] **Dashboard Amministrazione (Admin Only)**:
  - Report presenze per data selezionata con KPI (totale attesi, presenti, assenti, tasso affluenza, pasti).
  - Scheda assenze ingiustificate con chiamata telefonica immediata al genitore/tutore principale (`tel:`).
  - Report mensa con selezione periodo (da/a), totali pasti ed esportazione/dettaglio per data.
- [x] Test unitari con Vitest configurati e passanti.

### Applicazione Flutter (`primola_app`)
- [x] Configurazione architettura Riverpod e router GoRouter con redirect basati su ruoli.
- [x] `ApiClient` (Dio) configurato con gestione automatica header auth e gestione errori `ApiResponse<T>`.
- [x] Modelli DTO e Repository disaccoppiati (`StudentRepository`, `AttendanceRepository`, `ReportRepository`).
- [x] Schermate principali predisposte (Dashboard Presenze, Anagrafica, Admin Screen).

---

## 3. Prerequisiti e Avvio Rapido

### 1. Database PostgreSQL
Avviare il server PostgreSQL locale (porta 5432) ed eseguire gli script:
```bash
createdb primola
psql -d primola -f Primola_Prompts/db_schema.sql
psql -d primola -f Primola_Prompts/db_seed.sql
```

### 2. Backend Node.js
```bash
cd Primola_Backend
npm install
npm run dev
```
- API attiva su: `http://localhost:3000`
- Documentazione Swagger: `http://localhost:3000/api-docs`

### 3. Frontend Web Angular
```bash
cd primola_frontend
npm install
npm start
```
- Applicazione attiva su: `http://localhost:4200`
- Login rapido disponibile per i profili **Admin** e **Staff**.

### 4. Client Flutter (Opzionale)
```bash
cd primola_app
flutter pub get
flutter run -d chrome  # oppure dispositivo tablet/emulatore
```

---

## 4. Prossimi Passi Consigliati
1. **Completamento integrazione Flutter**: Sostituire le strutture dati mockate residue nel provider Flutter collegandole direttamente alle API REST del backend.
2. **Modulo Ricevute / Quote**: Integrazione della fatturazione o controllo pagamenti mensili basati su presenze effettive ed extra registrati.
3. **Notifiche Push / WhatsApp**: Invio automatico di messaggi ai tutori per assenze ingiustificate o promemoria attività.
