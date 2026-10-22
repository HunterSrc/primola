# Guida al Setup di Produzione su Debian & Docker

Questa guida descrive passo-passo la configurazione dell'ambiente su un server **Debian (11 Bullseye o 12 Bookworm)**: installazione di Docker, avvio del container PostgreSQL persistente, configurazione del backend e pianificazione dei backup mensili con rotazione.

---

## 1. Prerequisiti & Installazione Docker su Debian

Se la macchina Debian è nuova, esegui i comandi ufficiali per installare Docker Engine e Docker Compose plugin:

```bash
# 1. Aggiorna i pacchetti di sistema
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# 2. Aggiungi la chiave GPG ufficiale di Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. Aggiungi il repository Docker per Debian
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Installa Docker, Docker Compose e CLI
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. (Opzionale ma consigliato) Permetti al tuo utente di eseguire docker senza sudo
sudo usermod -aG docker $USER
newgrp docker
```

Verifica l'installazione:
```bash
docker --version
docker compose version
```

---

## 2. Preparazione e Avvio del Database con Docker Compose

Nella cartella principale del progetto:

### Passo 2.1: Configurare le Variabili d'Ambiente
Copia il file di configurazione d'esempio per Docker:
```bash
cp .env.docker.example .env
```
Modifica `.env` impostando una password sicura per il DB:
```ini
POSTGRES_DB=primola
POSTGRES_USER=postgres
POSTGRES_PASSWORD=la_tua_password_super_segreta
```

### Passo 2.2: Avviare il Container PostgreSQL
Esegui:
```bash
docker compose up -d
```

> **Come funziona la persistenza e l'inizializzazione:**
> - Il volume `primola_pgdata` conserva i dati anche se il container viene fermato o aggiornato (`docker compose down`).
> - Al primo avvio in assoluto, Docker esegue automaticamente `01_schema.sql` e `02_seed.sql` per creare tabelle, indici e dati iniziali. Nei successivi avvii questi script non verranno rieseguiti per non sovrascrivere i dati.

### Passo 2.3: Verifica Stato
```bash
# Controlla lo stato del container
docker compose ps

# Visualizza i log di PostgreSQL
docker compose logs -f primola_postgres
```

---

## 3. Configurazione del Backend Node.js per puntare al Container

Nel file di configurazione del backend (`Primola_Backend/.env`):

```ini
PORT=3000
# Utilizza la password configurata nel file .env di Docker
DATABASE_URL=postgresql://postgres:la_tua_password_super_segreta@localhost:5432/primola
JWT_SECRET=genera_una_stringa_lunga_e_casuale_per_il_jwt
```

Se il backend gira direttamente sull'host Debian, può collegarsi direttamente a `localhost:5432` perché la porta è esposta nel `docker-compose.yml`.

---

## 4. Pianificazione dei Backup Mensili (Cron)

Nel progetto sono stati predisposti due script pronti all'uso nella cartella `scripts/`:
- `scripts/backup_monthly.sh`: dump compresso gzip del DB con rimozione automatica dei file più vecchi di 365 giorni.
- `scripts/restore_db.sh`: script interattivo per il ripristino da un file di backup.

### Passo 4.1: Rendere gli Script Eseguibili
Dalla cartella del progetto:
```bash
chmod +x scripts/backup_monthly.sh scripts/restore_db.sh
```

### Passo 4.2: Creare la Directory di Destinazione
```bash
sudo mkdir -p /var/backups/primola
sudo chown $USER:$USER /var/backups/primola
```

### Passo 4.3: Test Manuale del Backup
Esegui subito una prova per verificare che tutto funzioni:
```bash
./scripts/backup_monthly.sh
```
Dovresti vedere generato il file compresso in `/var/backups/primola/primola_AAAAMMGG_HHMMSS.sql.gz`.

### Passo 4.4: Schedulare l'Esecuzione Mensile con Crontab
Apri l'editor cron per il tuo utente:
```bash
crontab -e
```

Aggiungi la riga seguente in fondo al file:
```cron
# Backup mensile Primola: il 1° giorno di ogni mese alle ore 03:00 del mattino
0 3 1 * * /bin/bash /percorso/assoluto/del/progetto/primola/scripts/backup_monthly.sh >> /var/log/primola_backup.log 2>&1
```
*(Sostituisci `/percorso/assoluto/del/progetto/primola` con il percorso reale sulla macchina, ad esempio `/opt/primola` o `/home/debian/primola`)*.

---

## 5. Procedura di Ripristino (Disaster Recovery)

In caso di necessità di ripristinare il database a uno stato precedente:

```bash
# Esegui lo script indicando il file .sql.gz
./scripts/restore_db.sh /var/backups/primola/primola_20261101_030000.sql.gz
```

Lo script chiederà conferma esplicita prima di sovrascrivere i dati nel container.

---

## 6. Comandi Utili per la Gestione Quotidiana

```bash
# Fermare il DB senza perdere dati
docker compose stop

# Riavviare il DB
docker compose start

# Accedere alla shell psql direttamente nel container
docker exec -it primola_postgres psql -U postgres -d primola

# Vedere lo spazio occupato dal volume dati
docker system df -v
```
