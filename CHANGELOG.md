## Release v3.1.0 - 2026-11-21

- **feat(mobile)**: aggiunta vista responsive a card mobile per Elenco Corsi (`/projects`) e lista Studenti Iscritti nel Dettaglio Corso (`/projects/:id`)
- **chore(release)**: incremento versione Minor v3.1.0

## Release v3.0.0 - 2026-11-21

- **feat(course-students)**: nuova anagrafica dedicata Studenti Corsi (`/course-students`, `/api/course-students`) con 10 campi completi, gestione tessera e badge/alert automatici per tessere in scadenza (≤ 30 gg) o scadute (migrazione `015_add_course_students_and_installments.sql`)
- **feat(course-payments)**: iscrizioni multi-corso con piano da 1 a 4 rate non vincolate al mese, interfaccia dedicata Pagamenti Corsi (`/course-payments`, `/api/course-enrollments`) con pagamento singola rata, modifica importo, storno e "Salda Tutto" con tutti i metodi di pagamento
- **feat(projects)**: calcolo automatico di `actual_enrolled` dalle iscrizioni reali, avviso statistico non bloccante per superamento capienza massima (`max_enrolled`), gestione iscritti in scheda corso e fix formattazione/persistenza date di svolgimento
- **feat(dashboard)**: aggiornamento Dashboard Riepiloghi con incassi corsi basati sulle sole rate pagate nel mese e sostituzione del "Previsto" corsi con le **Rimanenze da pagare**
- **chore(release)**: incremento versione Major v3.0.0

## Release v2.3.0 - 2026-11-21

- **feat(anagrafica)**: aggiunto campo email per i genitori/tutori nei form di creazione e modifica studente (con visualizzazione in lista)
- **feat(anagrafica)**: aggiunto campo libero testuale classe e sezione (es. `1°E`) sulla scheda studente
- **feat(anagrafica)**: aggiunte sezioni dedicate per allergeni/preferenze alimentari e vaccinazioni/note varie (migrazione `014_add_student_extra_fields.sql`)
- **chore(release)**: incremento versione v2.3.0

## Release v2.2.1 - 2026-11-18

- **fix(afterschool)**: disattivata la presenza preimpostata di default all'aggiunta di uno studente dal calendario (`is_present: false`)
- **chore(release)**: incremento versione v2.2.1

## Release v2.2.0 - 2026-11-18

- **feat(payments)**: rimozione previsione settimanale dai pagamenti mantenendo pendenze mese precedente (D13)
- **feat(afterschool)**: CTA copia alunni e docenti dalla settimana precedente nel calendario (solo Office/Admin)
- **feat(mobile)**: vista giornaliera mobile del calendario con carosello continuo, swipe left/right e card responsive su Pagamenti, Appello e Anagrafica
- **chore(release)**: incremento versione v2.2.0

## Release v2.1.0 - 2026-11-18

- **feat(nav)**: sidebar accordion con box interna elevata, animazione fluida e chiusura automatica (D12)
- **feat(payments)**: pianificazione mensile giorni doposcuola, decorrenza data pagamento e pendenze pregresse (D11)
- **feat(auth)**: registrazione autonoma utenti, approvazione admin e pulizia login (D10)
- **chore(release)**: allineamento e incremento versione v2.1.0

## Push to main - 2026-11-02 16:46:51

- 8b4d958 feat: spese doposcuola, pacchetti/tariffe, tracciamento pagamenti e rimozione app flutter deprecata (HunterSrc)
- 8e2ffeb docs: manuale operativo dettagliato con screenshot, PDF e aggiornamento analisi funzionale (Dario Marchesi)
- 0ac8b4b feat(reports): bilancio economico mensile admin e rendicontazione operativa office (Dario Marchesi)
- 0cccfe4 feat: calendario doposcuola con turni docenti, bambini, festivi e chiusure (Dario Marchesi)

## Push to main - 2026-11-02 16:46:29

- 8b4d958 feat: spese doposcuola, pacchetti/tariffe, tracciamento pagamenti e rimozione app flutter deprecata (HunterSrc)
- 8e2ffeb docs: manuale operativo dettagliato con screenshot, PDF e aggiornamento analisi funzionale (Dario Marchesi)
- 0ac8b4b feat(reports): bilancio economico mensile admin e rendicontazione operativa office (Dario Marchesi)
- 0cccfe4 feat: calendario doposcuola con turni docenti, bambini, festivi e chiusure (Dario Marchesi)

