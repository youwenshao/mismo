#!/bin/bash
set -euo pipefail

LOG_FILE="/var/log/mismo-backup-verify.log"
BACKUP_DIR="/Volumes/1TB_Storage/supabase_backups"
VERIFY_DB="mismo_backup_verify"
KEY_TABLES=("User" "Commission" "Build" "Project")

log() {
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >> "$LOG_FILE"
}

send_alert() {
    local priority="$1"
    local title="$2"
    local details="$3"
    local timestamp
    timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    local payload
    payload=$(cat <<EOF
{"priority":"${priority}","title":"${title}","details":"${details}","studio":"${HOSTNAME}","timestamp":"${timestamp}"}
EOF
)

    if [[ -n "${FARM_MONITOR_URL:-}" ]]; then
        curl -sf -X POST "${FARM_MONITOR_URL}/api/alert" \
            -H "Content-Type: application/json" \
            -d "$payload" -o /dev/null --max-time 10 && return 0
    fi
    log "WARN: Failed to send alert to FARM_MONITOR_URL"
    return 1
}

cleanup() {
    log "Cleaning up verification database"
    dropdb --if-exists "$VERIFY_DB" 2>>"$LOG_FILE" || true
}
trap cleanup EXIT

main() {
    log "=== Backup verification start ==="

    local latest_backup
    latest_backup=$(ls -t "${BACKUP_DIR}"/supabase_backup_*.sql.gz 2>/dev/null | head -1)

    if [[ -z "$latest_backup" ]]; then
        log "ERROR: No backup files found in ${BACKUP_DIR}"
        send_alert "P0" "Backup verification failed on ${HOSTNAME}" "No backup files found in ${BACKUP_DIR}" || true
        exit 1
    fi

    log "Verifying backup: ${latest_backup}"

    cleanup
    createdb "$VERIFY_DB" 2>>"$LOG_FILE"
    log "Created verification database: ${VERIFY_DB}"

    log "Restoring backup..."
    if ! gunzip -c "$latest_backup" | psql -d "$VERIFY_DB" -q 2>>"$LOG_FILE"; then
        log "ERROR: Failed to restore backup"
        send_alert "P0" "Backup verification failed on ${HOSTNAME}" "Failed to restore ${latest_backup} into verification database" || true
        exit 1
    fi
    log "Backup restored successfully"

    local failed_tables=()
    local table_counts=""

    for table in "${KEY_TABLES[@]}"; do
        # Prisma uses quoted identifiers for table names
        local count
        count=$(psql -d "$VERIFY_DB" -t -A -c "SELECT COUNT(*) FROM \"${table}\"" 2>>"$LOG_FILE") || count="ERROR"

        if [[ "$count" == "ERROR" ]] || (( count <= 0 )); then
            failed_tables+=("$table")
            log "FAIL: Table \"${table}\" has ${count} rows"
        else
            log "OK: Table \"${table}\" has ${count} rows"
        fi
        table_counts="${table_counts}${table}: ${count}, "
    done

    table_counts="${table_counts%, }"

    if (( ${#failed_tables[@]} > 0 )); then
        local failed_list
        failed_list=$(IFS=', '; echo "${failed_tables[*]}")
        log "ERROR: Verification failed for tables: ${failed_list}"
        send_alert "P0" "Backup verification FAILED on ${HOSTNAME}" "Empty/missing tables: ${failed_list}. Counts: ${table_counts}. Backup: $(basename "$latest_backup")" || true
        exit 1
    fi

    log "All tables verified: ${table_counts}"
    send_alert "P2" "Backup verification passed on ${HOSTNAME}" "All key tables have data. Counts: ${table_counts}. Backup: $(basename "$latest_backup")" || true
    log "=== Backup verification complete ==="
}

main
