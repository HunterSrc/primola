# Guida di Setup & Avvio del Progetto - Primola

Questa guida fornisce i passaggi precisi e ordinati per preparare l'ambiente ed avviare correttamente l'intero ecosistema **Primola** su una nuova macchina.

---

## 1. Prerequisiti di Sistema

Verificare che sulla macchina siano installati i seguenti strumenti:

- **Node.js**: v18.x o v20.x+ (`node -v`) e **npm** (`npm -v`)
- **PostgreSQL**: v15 o v16 (`psql -V`)
- **Git**: (`git -v`)
- *(Opzionale)* **Flutter SDK**: v3.x+ (`flutter --version`) per il client tablet/mobile

---

## 2. Passo 1: Configurazione del Database PostgreSQL

Assicurarsi che il servizio PostgreSQL sia in esecuzione sulla porta `5432` locale.

### Creazione DB e Popolamento Schema/Dati

Aprire un terminale ed eseguire:

```bash
# 1. Creazione del database (se non esiste già)
createdb -U postgres primola

# 2. Creazione delle tabelle, trigger e indici GIN
psql -U postgres -d primola -f Primola_Backend/db/db_schema.sql

# 3. Inserimento dati di seed (utenti admin/staff, anagrafica iniziale e presenze)
psql -U postgres -d primola -f Primola_Backend/db/db_seed.sql
```

> [!TIP]
> Su Windows con PowerShell è possibile utilizzare:
> `psql -U postgres -d primola -f Primola_Backend\db\db_schema.sql`  
> `psql -U postgres -d primola -f Primola_Backend\db\db_seed.sql`

---

## 3. Passo 2: Avvio del Backend Node.js (Express API)

Il backend espone le API REST e la documentazione Swagger.

### 1. File di Configurazione (`.env`)
Entrare nella cartella del backend e creare il file `.env` a partire dall'esempio:

```bash
cd Primola_Backend
cp .env.example .env
```

Contenuto di riferimento del file `Primola_Backend/.env`:
```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/primola
JWT_SECRET=chiave_segreta_jwt_molto_lunga_e_sicura
```
*(Modificare user/password nella stringa di connessione se il proprio PostgreSQL locale usa credenziali differenti).*

### 2. Installazione Dipendenze e Start
```bash
npm install
npm run dev
```

- **API Endpoint Base**: `http://localhost:3000`
- **Swagger UI Interattivo**: `http://localhost:3000/api-docs`

---

## 4. Passo 3: Avvio del Frontend Web (Angular 19+)

Aprire un **nuovo terminale** per la Web App:

```bash
cd primola_frontend
npm install
npm start
```

- **Applicazione Web**: `http://localhost:4200`
- Il server di sviluppo Angular include il routing e l'interceptor JWT automatico verso `http://localhost:3000`.

---

## 5. Passo 4 (Opzionale): Avvio dell'App Mobile/Tablet (Flutter)

Se si desidera eseguire anche il client tablet/mobile per gli operatori:

```bash
cd primola_app
flutter pub get
flutter run -d chrome  # oppure selezionare un dispositivo/emulatore collegato
```

---

## 6. Credenziali di Accesso Predefinite

I dati inseriti dallo script di seed (`db_seed.sql`) permettono l'accesso con due profili:

| Ruolo | Username | Password | Permessi Chiave |
|---|---|---|---|
| **Amministratore (Admin)** | `admin` | `admin123` | Accesso completo: Anagrafica, Presenze, Dashboard Reportistica, Quadratura Mensa, Assenze Ingiustificate con contatti tutori. |
| **Operatore (Staff)** | `staff` | `staff123` | Registrazione anagrafica, check-in presenze del giorno, spunta mensa, aggiunta studenti extra. |

---

## 7. Setup Tunnel per Accesso Remoto / Test da Dispositivi Mobili

Per testare l'applicazione web (`porta 4200`) o consentire all'app tablet/mobile Flutter di raggiungere il backend locale (`porta 3000`) da dispositivi fisici esterni alla rete LAN locale, è possibile esporre le porte tramite un tunnel sicuro.

### Opzione A: Cloudflare Quick Tunnels (Consigliata - Gratuita e senza account)
1. Scaricare l'eseguibile `cloudflared` (oppure installarlo con `winget install Cloudflare.cloudflared` su Windows, o `brew install cloudflared` su macOS).
2. Per esporre il **Backend API** (necessario se l'app mobile punta da remoto):
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   Verrà generato un URL pubblico HTTPS temporaneo (es. `https://random-subdomain.trycloudflare.com`).
3. Per esporre il **Frontend Web Angular**:
   ```bash
   cloudflared tunnel --url http://localhost:4200
   ```

### Opzione B: Localtunnel (Nessuna installazione binaria, solo Node/npx)
Eseguibile istantaneamente tramite `npx`:

- Per il **Frontend**:
  ```bash
  npx localtunnel --port 4200
  ```
- Per il **Backend**:
  ```bash
  npx localtunnel --port 3000
  ```

### Opzione C: Ngrok
Se si possiede già un account ngrok:
```bash
# Esposizione Frontend
ngrok http 4200

# Oppure Backend
ngrok http 3000
```

> [!IMPORTANT]
> **Avvertenza CORS & Host Check Angular per i Tunnel**:
> Quando si accede al frontend Angular tramite tunnel pubblico, avviare il frontend disabilitando il check dell'host:
> ```bash
> cd primola_frontend
> npm start -- --host 0.0.0.0 --disable-host-check
> ```
> Se l'app mobile o il frontend puntano all'URL del tunnel backend, ricordarsi di aggiornare l'endpoint base corrispondente (nel client Flutter o nell'ambiente Angular).

---

## 8. Verifica Rapida del Corretto Funzionamento (Smoke Test)

1. Aprire `http://localhost:4200` nel browser.
2. Eseguire il login con le credenziali **Admin** (`admin` / `admin123`).
3. Verificare:
   - **Sezione Presenze**: comparsa della lista studenti attesi per la data odierna.
   - **Sezione Anagrafica**: elenco degli studenti censiti con i rispettivi tutori.
   - **Sezione Report (Admin)**: visualizzazione dei KPI del giorno e del rendiconto pasti mensa.
