# Documentazione di Progetto Primola

Benvenuto nella directory di documentazione di **Primola**.

## Mappa dei Documenti

1. [**Istruzioni Antigravity per Ripresa Lavori (`docs/HANDOVER_ANTIGRAVITY.md`)**](./HANDOVER_ANTIGRAVITY.md)
   - Contesto rapido per l'agente AI Antigravity su un'altra postazione.
   - Stack tecnologico, comandi di avvio, regole operative, credenziali predefinite e roadmap delle implementazioni aperte.
2. [**Analisi Funzionale di Dettaglio (`docs/ANALISI_FUNZIONALE.md`)**](./ANALISI_FUNZIONALE.md)
   - Descrizione estesa dei processi di business: Anagrafica Studenti & Tutori, Rilevazione Presenze (Check-in), Rendicontazione Mensa e Gestione Assenze Ingiustificate.
3. [**Architettura Database (`docs/tech_summary_db.md`)**](./tech_summary_db.md)
   - Schema PostgreSQL, indici GIN per gli array dei giorni settimanali, trigger di audit e DDL/DML.
   - Script SQL attivi posizionati in: `Primola_Backend/db/` (`db_schema.sql`, `db_seed.sql`).
4. [**Specifiche Modulari**]:
   - [Backend Technical Summary](../Primola_Backend/TECHNICAL_SUMMARY.md) (API Express, RBAC, Swagger, Layering).
   - [App Flutter Technical Summary](../primola_app/technical_summary.md) (Client Tablet/Mobile, Riverpod, Dio, GoRouter).
   - [Frontend Angular](../primola_frontend/README.md) (Web App Angular 19+, Tailwind CSS, Vitest).
5. [**Archivio Prompt Iniziali (`docs/legacy_prompts/`)**](./legacy_prompts/)
   - Conserva per storico i prompt originali di bootstrap utilizzati per generare le prime versioni dei microservizi.
