<#
.SYNOPSIS
    Primola — Script di Deploy e Gestione Remota (PowerShell)
.DESCRIPTION
    Consente il rilascio rapido delle modifiche (Frontend Angular, Backend Node.js, Database)
    direttamente sul server primols-derver via Tailscale SSH.
.EXAMPLE
    .\scripts\deploy.ps1 -Target all
    .\scripts\deploy.ps1 -Target frontend
    .\scripts\deploy.ps1 -Target backend
    .\scripts\deploy.ps1 -Target status
    .\scripts\deploy.ps1 -Target backup
    .\scripts\deploy.ps1 -Target logs -Service primola_backend
#>

[CmdletBinding()]
param(
    [ValidateSet("all", "frontend", "backend", "rebuild", "status", "logs", "backup", "migrate", "help")]
    [string]$Target = "all",

    [string]$File = "",
    [string]$Service = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Carica configurazione da deploy.env se esiste
$DeployHost = "100.84.100.38"
$DeployUser = "primola"
$DeployDir = "/home/primola/docker/primola"
$DeployPort = "8082"

$EnvFile = Join-Path $ScriptDir "deploy.env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split "=", 2
            if ($parts.Count -eq 2) {
                $key = $parts[0].Trim()
                $val = $parts[1].Trim('"', "'", " ")
                if ($key -eq "DEPLOY_HOST") { $DeployHost = $val }
                if ($key -eq "DEPLOY_USER") { $DeployUser = $val }
                if ($key -eq "DEPLOY_DIR") { $DeployDir = $val }
                if ($key -eq "DEPLOY_PORT") { $DeployPort = $val }
            }
        }
    }
}

$Remote = "$DeployUser@$DeployHost"

function Log-Info ($msg) { Write-Host "ℹ [PRIMOLA] $msg" -ForegroundColor Cyan }
function Log-Ok   ($msg) { Write-Host "✔ [PRIMOLA] $msg" -ForegroundColor Green }
function Log-Warn ($msg) { Write-Host "⚠ [PRIMOLA] $msg" -ForegroundColor Yellow }
function Log-Err  ($msg) { Write-Host "✖ [PRIMOLA] $msg" -ForegroundColor Red }

function Test-SshConnection {
    Log-Info "Verifica connettività SSH verso $Remote..."
    $res = & ssh -o ConnectTimeout=5 -o BatchMode=yes $Remote "echo connected" 2>&1
    if ($LASTEXITCODE -ne 0) {
        Log-Err "Impossibile connettersi a $Remote. Verifica che Tailscale sia attivo."
        exit 1
    }
    Log-Ok "Connessione SSH attiva."
}

function Sync-Directory ($localPath, $remoteParent) {
    $folderName = Split-Path -Leaf $localPath
    $parentPath = Split-Path -Parent $localPath
    Log-Info "Sincronizzazione $folderName in $remoteParent..."

    & ssh $Remote "mkdir -p $remoteParent"
    $tempArchive = [System.IO.Path]::GetTempFileName() + ".tar.gz"
    Push-Location $parentPath
    try {
        & tar.exe -czf $tempArchive $folderName
        if ($LASTEXITCODE -ne 0) {
            throw "Errore durante la creazione del pacchetto tar locale."
        }
        & scp $tempArchive "$Remote`:$remoteParent/temp_sync.tar.gz"
        if ($LASTEXITCODE -ne 0) {
            throw "Errore durante l'invio SCP verso il server."
        }
        & ssh $Remote "tar -xzf $remoteParent/temp_sync.tar.gz -C $remoteParent && rm -f $remoteParent/temp_sync.tar.gz"
        if ($LASTEXITCODE -ne 0) {
            throw "Errore durante l'estrazione tar sul server."
        }
    } finally {
        Pop-Location
        if (Test-Path $tempArchive) { Remove-Item -Force $tempArchive }
    }
    Log-Ok "Sincronizzazione completata per $folderName."
}

function Build-Frontend {
    Log-Info "Compilazione locale frontend Angular (ng build)..."
    Push-Location "$ProjectRoot\primola_frontend"
    try {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) {
            throw "Compilazione Angular fallita."
        }
    } finally {
        Pop-Location
    }
    Log-Ok "Build Angular completata con successo."
}

function Deploy-Frontend {
    Build-Frontend
    $distPath = "$ProjectRoot\primola_frontend\dist\primola_frontend\browser"
    if (-not (Test-Path $distPath)) {
        throw "Cartella build non trovata in: $distPath"
    }
    Sync-Directory $distPath "$DeployDir/primola_frontend/dist/primola_frontend"
    Log-Info "Sincronizzazione configurazione Nginx (nginx.conf)..."
    & scp "$ProjectRoot\primola_frontend\nginx.conf" "$Remote`:$DeployDir/primola_frontend/nginx.conf"
    Log-Info "Ricaricamento configurazione Nginx..."
    & ssh $Remote "docker exec primola_frontend nginx -s reload 2>/dev/null || docker compose -f $DeployDir/docker-compose.yml restart primola_frontend"
    Log-Ok "Frontend aggiornato e attivo!"
}

function Deploy-Backend {
    Log-Info "Sincronizzazione codice backend (src/)..."
    Sync-Directory "$ProjectRoot\Primola_Backend\src" "$DeployDir/Primola_Backend"
    Log-Info "Riavvio rapido del container Backend Node.js..."
    & ssh $Remote "cd $DeployDir && docker compose restart primola_backend"
    Log-Ok "Backend aggiornato e riavviato!"
}

function Deploy-ComposeConfig {
    Log-Info "Sincronizzazione file di configurazione Docker..."
    & scp "$ProjectRoot\docker-compose.yml" "$Remote`:$DeployDir/docker-compose.yml"
    if (Test-Path "$ProjectRoot\.env.production") {
        & scp "$ProjectRoot\.env.production" "$Remote`:$DeployDir/.env"
    }
}

function Check-Status {
    Log-Info "Verifica stato servizi su $DeployHost..."
    & ssh $Remote "cd $DeployDir && docker compose ps"
    Write-Host ""
    Log-Info "Test endpoint di diagnostica /api/health..."
    try {
        $res = Invoke-RestMethod -Uri "http://$DeployHost`:$DeployPort/api/health" -TimeoutSec 5
        if ($res.status -eq "ok") {
            Log-Ok "API Health: OK (http://$DeployHost`:$DeployPort)"
        } else {
            Log-Warn "Risposta inattesa da /api/health: $($res | ConvertTo-Json)"
        }
    } catch {
        Log-Warn "API Health check non risponde ancora: $_"
    }
}

function Backup-Db {
    Test-SshConnection
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupDir = Join-Path $ProjectRoot "backups"
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    }
    $backupFile = Join-Path $backupDir "primola_backup_$timestamp.sql"
    Log-Info "Esecuzione dump database PostgreSQL da remoto..."
    & ssh $Remote "docker exec primola_postgres pg_dump -U postgres primola" | Set-Content -Path $backupFile -Encoding UTF8
    $size = (Get-Item $backupFile).Length
    Log-Ok "Backup salvato in: $backupFile ($size bytes)"
}

function Run-Migration ($sqlFile) {
    if (-not $sqlFile -or -not (Test-Path $sqlFile)) {
        Log-Err "Specificare un file SQL valido. Esempio: .\scripts\deploy.ps1 -Target migrate -File Primola_Backend\db\migrations\010_...sql"
        exit 1
    }
    Test-SshConnection
    Log-Info "Backup preventivo automatico del database prima della migrazione..."
    Backup-Db
    Log-Info "Applicazione migrazione SQL: $sqlFile..."
    Get-Content $sqlFile -Raw | & ssh $Remote "docker exec -i primola_postgres psql -U postgres -d primola"
    if ($LASTEXITCODE -ne 0) {
        Log-Err "Errore durante l'applicazione della migrazione SQL!"
        exit 1
    }
    Log-Ok "Migrazione applicata con successo!"
}

function View-Logs ($svc) {
    Test-SshConnection
    if ($svc) {
        & ssh -t $Remote "cd $DeployDir && docker compose logs -f $svc"
    } else {
        & ssh -t $Remote "cd $DeployDir && docker compose logs -f"
    }
}

function Rebuild-Images {
    Test-SshConnection
    Log-Warn "Ricostruzione completa delle immagini Docker sul server (rebuild)..."
    Deploy-ComposeConfig
    Sync-Directory "$ProjectRoot\Primola_Backend" "$DeployDir"
    Sync-Directory "$ProjectRoot\primola_frontend" "$DeployDir"
    & ssh $Remote "cd $DeployDir && docker compose build && docker compose up -d"
    Log-Ok "Immagini ricostruite e container aggiornati."
    Check-Status
}

# Esecuzione del target richiesto
switch ($Target) {
    "all" {
        Test-SshConnection
        Deploy-ComposeConfig
        Deploy-Backend
        Deploy-Frontend
        Check-Status
    }
    "frontend" {
        Test-SshConnection
        Deploy-Frontend
        Check-Status
    }
    "backend" {
        Test-SshConnection
        Deploy-Backend
        Check-Status
    }
    "rebuild" {
        Rebuild-Images
    }
    "migrate" {
        Run-Migration $File
    }
    "backup" {
        Backup-Db
    }
    "status" {
        Test-SshConnection
        Check-Status
    }
    "logs" {
        View-Logs $Service
    }
    "help" {
        Get-Help $MyInvocation.MyCommand.Path -Detailed
    }
}
