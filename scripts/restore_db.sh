#!/bin/bash
set -euo pipefail

# ==============================================================================
# Script di Ripristino Database Primola PostgreSQL (Docker)
# Uso: ./scripts/restore_db.sh /percorso/al/file_backup.sql.gz
# ==============================================================================

if [ -z "${1:-}" ]; then
  echo "Uso: $0 <percorso_file_backup.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="${CONTAINER_NAME:-primola_postgres}"
DB_NAME="${DB_NAME:-primola}"
DB_USER="${DB_USER:-postgres}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "[ERRORE] File di backup non trovato: ${BACKUP_FILE}" >&2
  exit 1
fi

echo "ATTENZIONE: Questa operazione sovrascrivera/aggiornera i dati nel DB '${DB_NAME}'."
read -p "Continuare con il restore? (s/N): " CONFIRM
if [[ ! "${CONFIRM}" =~ ^[sSyY]$ ]]; then
  echo "Operazione annullata."
  exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ripristino in corso da '${BACKUP_FILE}'..."

# Decomprime e invia a psql nel container
gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ripristino completato con successo!"
