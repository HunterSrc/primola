#!/bin/bash
set -euo pipefail

# ==============================================================================
# Script di Backup Automatico Database Primola PostgreSQL (Docker)
# ==============================================================================

# Directory dove archiviare i backup
BACKUP_DIR="${BACKUP_DIR:-/var/backups/primola}"
CONTAINER_NAME="${CONTAINER_NAME:-primola_postgres}"
DB_NAME="${DB_NAME:-primola}"
DB_USER="${DB_USER:-postgres}"

# Timestamp per identificare il file (es: primola_20261101_030000.sql.gz)
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Assicura che la directory esista
mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Inizio backup database '${DB_NAME}' dal container '${CONTAINER_NAME}'..."

# Verifica se il container e in esecuzione
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "[ERRORE] Il container '${CONTAINER_NAME}' non risulta attivo!" >&2
  exit 1
fi

# Esecuzione dump compresso
docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completato con successo: ${BACKUP_FILE}"
echo "[Dimensione]: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Pulizia dei backup piu vecchi di 365 giorni (mantiene lo storico dell'ultimo anno)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pulizia vecchi backup (retention: 365 giorni)..."
find "${BACKUP_DIR}" -type f -name "${DB_NAME}_*.sql.gz" -mtime +365 -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Operazione completata regolarmente."
