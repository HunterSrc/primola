#!/usr/bin/env bash
# ==============================================================================
# Primola — Script di Deploy & Aggiornamento Automatico
# Compatibile con Linux, macOS e Windows (Git Bash / WSL)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Caricamento configurazione
ENV_FILE="$SCRIPT_DIR/deploy.env"
if [ -f "$ENV_FILE" ]; then
    # shellcheck source=/dev/null
    source "$ENV_FILE"
fi

DEPLOY_HOST="${DEPLOY_HOST:-100.84.100.38}"
DEPLOY_USER="${DEPLOY_USER:-primola}"
DEPLOY_DIR="${DEPLOY_DIR:-/home/primola/docker/primola}"
DEPLOY_PORT="${DEPLOY_PORT:-8082}"

REMOTE="$DEPLOY_USER@$DEPLOY_HOST"

# Colori per il terminale
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ [PRIMOLA]${NC} $1"; }
log_ok()   { echo -e "${GREEN}✔ [PRIMOLA]${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠ [PRIMOLA]${NC} $1"; }
log_err()  { echo -e "${RED}✖ [PRIMOLA]${NC} $1"; }

check_connection() {
    log_info "Verifica connettività SSH verso $REMOTE..."
    if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$REMOTE" "echo connected" >/dev/null 2>&1; then
        log_err "Impossibile connettersi via SSH a $REMOTE. Verifica che Tailscale sia attivo."
        exit 1
    fi
    log_ok "Connessione SSH stabilita con successo."
}

sync_stream() {
    local src_dir="$1"
    local dest_dir="$2"
    local base_name
    base_name="$(basename "$src_dir")"
    local parent_dir
    parent_dir="$(dirname "$src_dir")"

    log_info "Sincronizzazione in corso: $base_name -> $dest_dir..."
    ssh "$REMOTE" "mkdir -p $dest_dir"

    if command -v rsync >/dev/null 2>&1; then
        rsync -avz --delete "$src_dir/" "$REMOTE:$dest_dir/$base_name/"
    else
        # Streaming tar compresso via SSH (compatibile con qualsiasi shell senza rsync)
        (cd "$parent_dir" && tar -czf - "$base_name") | ssh "$REMOTE" "tar -xzf - -C $dest_dir"
    fi
    log_ok "Sincronizzazione completata per $base_name."
}

build_frontend() {
    log_info "Compilazione locale frontend Angular (ng build)..."
    cd "$PROJECT_ROOT/primola_frontend"
    npm run build
    log_ok "Build Angular completata con successo."
}

deploy_frontend() {
    build_frontend
    sync_stream "$PROJECT_ROOT/primola_frontend/dist/primola_frontend/browser" "$DEPLOY_DIR/primola_frontend/dist/primola_frontend"
    log_info "Sincronizzazione configurazione Nginx (nginx.conf)..."
    scp "$PROJECT_ROOT/primola_frontend/nginx.conf" "$REMOTE:$DEPLOY_DIR/primola_frontend/nginx.conf"
    log_info "Ricaricamento configurazione Nginx..."
    ssh "$REMOTE" "docker exec primola_frontend nginx -s reload 2>/dev/null || docker compose -f $DEPLOY_DIR/docker-compose.yml restart primola_frontend"
    log_ok "Frontend aggiornato e attivo!"
}

deploy_backend() {
    log_info "Sincronizzazione codice backend (src/)..."
    sync_stream "$PROJECT_ROOT/Primola_Backend/src" "$DEPLOY_DIR/Primola_Backend"
    log_info "Riavvio rapido del container Backend Node.js..."
    ssh "$REMOTE" "cd $DEPLOY_DIR && docker compose restart primola_backend"
    log_ok "Backend aggiornato e riavviato!"
}

deploy_compose_config() {
    log_info "Sincronizzazione file di configurazione Docker..."
    scp "$PROJECT_ROOT/docker-compose.yml" "$REMOTE:$DEPLOY_DIR/docker-compose.yml"
    if [ -f "$PROJECT_ROOT/.env.production" ]; then
        scp "$PROJECT_ROOT/.env.production" "$REMOTE:$DEPLOY_DIR/.env"
    fi
}

deploy_all() {
    check_connection
    deploy_compose_config
    deploy_backend
    deploy_frontend
    check_status
}

rebuild_images() {
    check_connection
    log_warn "Ricostruzione completa delle immagini Docker sul server (rebuild)..."
    deploy_compose_config
    sync_stream "$PROJECT_ROOT/Primola_Backend" "$DEPLOY_DIR"
    sync_stream "$PROJECT_ROOT/primola_frontend" "$DEPLOY_DIR"
    ssh "$REMOTE" "cd $DEPLOY_DIR && docker compose build && docker compose up -d"
    log_ok "Immagini ricostruite e container aggiornati."
    check_status
}

run_migration() {
    local sql_file="$1"
    if [ -z "$sql_file" ] || [ ! -f "$sql_file" ]; then
        log_err "Specificare un file SQL valido. Esempio: ./scripts/deploy.sh migrate Primola_Backend/db/migrations/010_...sql"
        exit 1
    fi
    check_connection
    log_info "Backup preventivo automatico del database prima della migrazione..."
    backup_db
    log_info "Applicazione migrazione SQL: $sql_file..."
    ssh "$REMOTE" "docker exec -i primola_postgres psql -U postgres -d primola" < "$sql_file"
    log_ok "Migrazione applicata con successo!"
}

backup_db() {
    check_connection
    local timestamp
    timestamp="$(date +'%Y%m%d_%H%M%S')"
    local backup_dir="$PROJECT_ROOT/backups"
    local backup_file="$backup_dir/primola_backup_$timestamp.sql"
    mkdir -p "$backup_dir"

    log_info "Esecuzione dump database PostgreSQL da remoto..."
    ssh "$REMOTE" "docker exec primola_postgres pg_dump -U postgres primola" > "$backup_file"
    log_ok "Backup salvato con successo in: $backup_file ($(wc -c < "$backup_file") bytes)"
}

check_status() {
    log_info "Verifica stato servizi su $DEPLOY_HOST..."
    ssh "$REMOTE" "cd $DEPLOY_DIR && docker compose ps"
    echo ""
    log_info "Test endpoint di diagnostica /api/health..."
    if curl -s -f "http://$DEPLOY_HOST:$DEPLOY_PORT/api/health" >/dev/null 2>&1; then
        log_ok "API Health: OK (http://$DEPLOY_HOST:$DEPLOY_PORT)"
    else
        log_warn "API Health check non risponde ancora. Controllare i log con: ./scripts/deploy.sh logs backend"
    fi
}

view_logs() {
    local service="${1:-}"
    check_connection
    if [ -n "$service" ]; then
        ssh -t "$REMOTE" "cd $DEPLOY_DIR && docker compose logs -f $service"
    else
        ssh -t "$REMOTE" "cd $DEPLOY_DIR && docker compose logs -f"
    fi
}

show_help() {
    echo "Primola — Script di Deploy & Manutenzione"
    echo ""
    echo "Uso: ./scripts/deploy.sh [comando]"
    echo ""
    echo "Comandi disponibili:"
    echo "  all                  Deploy completo rapido (build locale frontend + sync backend + reload) [Default]"
    echo "  frontend             Compila Angular localmente e aggiorna Nginx con zero downtime (~5s)"
    echo "  backend              Sincronizza Primola_Backend/src e riavvia Node.js (~2s)"
    echo "  rebuild              Ricostruisce da zero le immagini Docker sul server (da usare se cambiano dipendenze npm)"
    echo "  migrate <file.sql>   Applica una migrazione SQL direttamente nel DB PostgreSQL"
    echo "  backup               Crea un dump completo del database di produzione e lo scarica in ./backups/"
    echo "  status               Visualizza lo stato dei container e l'healthcheck"
    echo "  logs [servizio]      Visualizza i log remoti in tempo reale (es. backend, frontend, postgres)"
    echo "  help                 Mostra questo messaggio di aiuto"
    echo ""
}

# Parsing comandi
ACTION="${1:-all}"
shift || true

case "$ACTION" in
    all)
        deploy_all
        ;;
    frontend)
        check_connection
        deploy_frontend
        ;;
    backend)
        check_connection
        deploy_backend
        ;;
    rebuild)
        rebuild_images
        ;;
    migrate)
        run_migration "$1"
        ;;
    backup)
        backup_db
        ;;
    status)
        check_connection
        check_status
        ;;
    logs)
        view_logs "$1"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_err "Comando non riconosciuto: $ACTION"
        show_help
        exit 1
        ;;
esac
