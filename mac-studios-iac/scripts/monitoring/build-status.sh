#!/bin/bash
# build-status.sh - Shows current n8n queue depth per Studio

HOSTS=("studio-1" "studio-2" "studio-3")
USER="admin"

printf "%-15s | %-25s\n" "HOST" "N8N STATUS / QUEUE DEPTH"
printf "%s\n" "--------------------------------------------"

for HOST in "${HOSTS[@]}"; do
    STATUS=$(ssh -o ConnectTimeout=5 "$USER@$HOST" '
        # Source profile to ensure n8n is in PATH
        [ -f ~/.zprofile ] && source ~/.zprofile
        [ -f ~/.zshrc ] && source ~/.zshrc
        export PATH="/opt/homebrew/bin:/opt/homebrew/opt/node@20/bin:$PATH"

        # Check if n8n process is running
        if pgrep -f "n8n" >/dev/null || pgrep -f "node.*n8n" >/dev/null; then
            # If n8n is running in queue mode, queue:health will return data
            # If it is standard mode or fails, we gracefully catch it
            QUEUE_OUT=$(n8n queue:health 2>/dev/null)
            if [ $? -eq 0 ] && echo "$QUEUE_OUT" | grep -qi "waiting"; then
                WAITING=$(echo "$QUEUE_OUT" | awk "/waiting/ {print \$2}")
                echo "Running (Queue: $WAITING)"
            else
                echo "Running (Standard Mode)"
            fi
        else
            echo "Stopped"
        fi
    ' 2>/dev/null)

    if [ $? -eq 0 ]; then
        printf "%-15s | %-25s\n" "$HOST" "$STATUS"
    else
        printf "%-15s | %-25s\n" "$HOST" "OFFLINE"
    fi
done
