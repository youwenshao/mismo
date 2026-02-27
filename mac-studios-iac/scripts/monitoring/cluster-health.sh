#!/bin/bash
# cluster-health.sh - Reports CPU, RAM, and Disk for all 3 Studios via SSH

HOSTS=("studio-1" "studio-2" "studio-3")
USER="admin"

printf "%-15s | %-10s | %-15s | %-10s\n" "HOST" "CPU USAGE" "RAM USED" "DISK (/)"
printf "%s\n" "------------------------------------------------------------"

for HOST in "${HOSTS[@]}"; do
    STATS=$(ssh -o ConnectTimeout=5 "$USER@$HOST" '
        # Gather CPU usage
        CPU=$(top -l 1 | awk "/CPU usage/ {print \$3 + \$5}")
        
        # Gather RAM usage
        RAM=$(top -l 1 | awk "/PhysMem/ {print \$2}")
        
        # Gather Disk usage for root
        DISK=$(df -h / | awk "NR==2 {print \$5}")
        
        echo "${CPU}%|${RAM}|${DISK}"
    ' 2>/dev/null)

    if [ $? -eq 0 ]; then
        CPU=$(echo "$STATS" | cut -d"|" -f1)
        RAM=$(echo "$STATS" | cut -d"|" -f2)
        DISK=$(echo "$STATS" | cut -d"|" -f3)
        printf "%-15s | %-10s | %-15s | %-10s\n" "$HOST" "$CPU" "$RAM" "$DISK"
    else
        printf "%-15s | %-10s | %-15s | %-10s\n" "$HOST" "OFFLINE" "N/A" "N/A"
    fi
done
