#!/bin/bash
set -euo pipefail

LOG_FILE="/var/log/mismo-watchdog.log"
RAM_COUNTER_FILE="/tmp/mismo-ram-high-count"
CPU_COUNTER_FILE="/tmp/mismo-cpu-high-count"

RAM_THRESHOLD=85
DISK_THRESHOLD=90
CPU_THRESHOLD=95
RAM_ALERT_COUNT=5
CPU_ALERT_COUNT=10

N8N_COMPOSE_FILE="/opt/mismo/docker/n8n-ha/docker-compose.worker.yml"

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
        if curl -sf -X POST "${FARM_MONITOR_URL}/api/alert" \
            -H "Content-Type: application/json" \
            -d "$payload" -o /dev/null --max-time 10; then
            log "Alert sent to FARM_MONITOR_URL: [${priority}] ${title}"
            return 0
        fi
        log "WARN: Failed to send alert to FARM_MONITOR_URL, trying Slack fallback"
    fi

    if [[ -n "${SLACK_ALERT_WEBHOOK_URL:-}" ]]; then
        local icon="⚠️"
        [[ "$priority" == "P0" ]] && icon="🔴"
        [[ "$priority" == "P2" ]] && icon="🟢"
        local slack_payload
        slack_payload=$(cat <<EOF
{"text":"${icon} *[${priority}] ${title}*\nStudio: ${HOSTNAME}\nTime: ${timestamp}\n\`\`\`${details}\`\`\`"}
EOF
)
        if curl -sf -X POST "${SLACK_ALERT_WEBHOOK_URL}" \
            -H "Content-Type: application/json" \
            -d "$slack_payload" -o /dev/null --max-time 10; then
            log "Alert sent to Slack: [${priority}] ${title}"
            return 0
        fi
        log "WARN: Failed to send alert to Slack"
    fi

    log "ERROR: No alert destination configured or all destinations failed"
    return 1
}

read_counter() {
    local file="$1"
    if [[ -f "$file" ]]; then
        cat "$file"
    else
        echo 0
    fi
}

write_counter() {
    echo "$2" > "$1"
}

check_ram() {
    local ram_pct
    # macOS top reports PhysMem as "PhysMem: XXG used (YYM wired, ...)" — parse used vs total
    ram_pct=$(vm_stat | awk '
        /Pages active/    { active = $NF+0 }
        /Pages wired/     { wired = $NF+0 }
        /Pages speculative/ { spec = $NF+0 }
        /Pages occupied by compressor/ { comp = $NF+0 }
        /Pages free/      { free = $NF+0 }
        /Pages inactive/  { inactive = $NF+0 }
        END {
            used = active + wired + spec + comp
            total = used + free + inactive
            if (total > 0) printf "%d", (used * 100 / total)
            else print 0
        }
    ')

    local count
    count=$(read_counter "$RAM_COUNTER_FILE")

    if (( ram_pct > RAM_THRESHOLD )); then
        count=$((count + 1))
        write_counter "$RAM_COUNTER_FILE" "$count"
        log "RAM high: ${ram_pct}% (count: ${count}/${RAM_ALERT_COUNT})"

        if (( count >= RAM_ALERT_COUNT )); then
            send_alert "P1" "High RAM usage on ${HOSTNAME}" "RAM at ${ram_pct}% for ${count} consecutive checks. Reducing n8n worker concurrency." || true
            log "Reducing n8n worker concurrency to 10"
            docker compose -f "$N8N_COMPOSE_FILE" down 2>>"$LOG_FILE" || true
            QUEUE_BULL_CONCURRENCY=10 docker compose -f "$N8N_COMPOSE_FILE" up -d 2>>"$LOG_FILE" || true
            write_counter "$RAM_COUNTER_FILE" 0
        fi
    else
        write_counter "$RAM_COUNTER_FILE" 0
    fi

    log "RAM check: ${ram_pct}%"
}

check_disk() {
    local disk_pct
    disk_pct=$(df / | awk 'NR==2 { gsub(/%/,"",$5); print $5 }')

    if (( disk_pct > DISK_THRESHOLD )); then
        log "Disk critical: ${disk_pct}% — pruning Docker"
        send_alert "P1" "Disk usage critical on ${HOSTNAME}" "Disk at ${disk_pct}%. Running docker system prune." || true
        docker system prune -af 2>>"$LOG_FILE" || true
    fi

    log "Disk check: ${disk_pct}%"
}

check_cpu() {
    local cpu_pct
    # macOS top: "CPU usage: XX.XX% user, YY.YY% sys, ZZ.ZZ% idle"
    cpu_pct=$(top -l 1 -n 0 2>/dev/null | awk '/CPU usage/ {
        gsub(/%/,"")
        user = $3+0
        sys = $5+0
        printf "%d", user + sys
    }')

    local count
    count=$(read_counter "$CPU_COUNTER_FILE")

    if (( cpu_pct > CPU_THRESHOLD )); then
        count=$((count + 1))
        write_counter "$CPU_COUNTER_FILE" "$count"
        log "CPU high: ${cpu_pct}% (count: ${count}/${CPU_ALERT_COUNT})"

        if (( count >= CPU_ALERT_COUNT )); then
            send_alert "P0" "Sustained high CPU on ${HOSTNAME}" "CPU at ${cpu_pct}% for ${count} consecutive checks. Killing long-running containers." || true
            # Kill containers running > 90 minutes
            local killed=0
            while IFS=' ' read -r cid running_for; do
                [[ -z "$cid" ]] && continue
                # docker RunningFor format: "About an hour", "2 hours", "X minutes"
                if echo "$running_for" | grep -qE '([2-9]|[0-9]{2,}) hours|About an hour'; then
                    log "Killing long-running container: ${cid} (${running_for})"
                    docker kill "$cid" 2>>"$LOG_FILE" || true
                    killed=$((killed + 1))
                fi
            done < <(docker ps --filter status=running --format '{{.ID}} {{.RunningFor}}' 2>/dev/null)
            log "Killed ${killed} long-running containers"
            write_counter "$CPU_COUNTER_FILE" 0
        fi
    else
        write_counter "$CPU_COUNTER_FILE" 0
    fi

    log "CPU check: ${cpu_pct}%"
}

main() {
    log "=== Watchdog run start ==="
    check_ram
    check_disk
    check_cpu
    log "=== Watchdog run complete ==="
}

main
