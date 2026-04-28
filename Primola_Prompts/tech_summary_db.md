# Riepilogo Tecnico: Configurazione Database "Primola"

## 1. Progettazione e Architettura (PostgreSQL)
- **Modellazione Dati Relazionale**: Generazione degli script DDL per le entità `users`, `students`, `tutors` e `attendances`.
- **Ottimizzazione Query (GIN)**: Implementazione di array di interi (`SMALLINT[]`) per i campi `giorni_abbonamento` e `giorni_mensa` all'interno della tabella `students`. Questi campi sono stati indicizzati tramite **Generalized Inverted Index (GIN)** (`USING GIN`) per garantire performance O(1) e sfruttare operatori di overlapping/contenimento (es. `<@`).
- **Integrità Referenziale e Vincoli**:
  - Utilizzo sistematico di `UUID` (generati nativamente via `gen_random_uuid()`) per tutte le Primary Key.
  - Implementazione di vincoli di `FOREIGN KEY` con politica `ON DELETE CASCADE` per il corretto cleanup delle associazioni (Tutors e Attendances).
  - Adozione di un vincolo `UNIQUE(student_id, date)` su `attendances` per l'idempotenza e per prevenire race conditions lato backend durante l'inserimento delle presenze.
- **Automazione Timestamp**: Creazione di una function `PL/pgSQL` accoppiata a `BEFORE UPDATE TRIGGER` per l'aggiornamento automatico e delegato a basso livello della colonna `updated_at`.
- **Seeding dei Dati (DML)**: Generazione di uno script `db_seed.sql` per l'inserimento di mockup data (utenti con mock hash bcrypt, studenti, e presenze simulate retroattive via `CURRENT_DATE - INTERVAL`).

## 2. Provisioning e Deployment Locale (macOS)
- **Environment Assessment**: Verifica della disponibilità di runtime come Docker, Nix e Homebrew all'interno dello user-space del terminale (`zsh`).
- **Installazione PostgreSQL**: Avvio di un processo in background isolato per l'installazione unattended del package `postgresql@16` tramite l'API di `brew`.
- **Service Orchestration**: Avvio del demone di PostgreSQL (`brew services start postgresql@16`) e allocazione del cluster dei dati su locale.
- **Bootstrapping del Database**: 
  - Creazione del database logico `primola` mediante l'utility CLI `createdb`.
  - Ingestion e applicazione degli script tramite `psql`, confermando in standard output (exit code 0) l'avvenuta build dello schema e delle tuple per il seeding.

## 3. Inter-Agent Prompt Engineering (Handoff Backend)
- **Inizializzazione Handoff Node.js**: Creazione del file `prompt_backend_db_connection.md` contenente il context dell'architettura DB appena distribuita.
- **Specifiche Architetturali Backend**:
  - Imposizione dell'utilizzo del driver `pg` raw-level o query-builder (bypassando ORM pesanti come TypeORM o Prisma) per preservare l'uso ottimizzato delle feature native (come enum, GIN e trigger) implementate lato RDBMS.
  - Richiesta di implementazione di un robusto `Connection Pool` asincrono e di una gestione strict delle environment variables (`.env`).
