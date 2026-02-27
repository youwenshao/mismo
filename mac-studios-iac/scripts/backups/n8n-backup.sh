#!/bin/bash
# n8n-backup.sh - Exports n8n workflows and pushes to git

HOSTS=("studio-1" "studio-2" "studio-3")
USER="admin"
BACKUP_REPO_DIR="~/n8n_backups_repo" # Directory containing initialized git repo on each host
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo "Starting n8n workflow backups across cluster..."

for HOST in "${HOSTS[@]}"; do
    echo "Backing up workflows on $HOST..."
    
    ssh "$USER@$HOST" "
        # Source profile for n8n/git
        [ -f ~/.zprofile ] && source ~/.zprofile
        export PATH=\"/opt/homebrew/bin:/opt/homebrew/opt/node@20/bin:\$PATH\"
        
        # Ensure repo directory exists
        if [ ! -d \"$BACKUP_REPO_DIR\" ]; then
            echo \"$BACKUP_REPO_DIR does not exist. Please initialize it with 'git init' and set a remote origin.\"
            exit 1
        fi
        
        cd \"$BACKUP_REPO_DIR\"
        
        # Export all workflows from n8n into individual JSON files
        # Depending on n8n version, export might require specific commands
        # This exports to a file named 'workflows.json' inside the repo
        n8n export:workflow --backup --output=\"workflows.json\" >/dev/null 2>&1
        
        if [ \$? -eq 0 ]; then
            # Commit and push
            git add workflows.json
            
            # Only commit if there are changes
            if ! git diff --cached --quiet; then
                git commit -m \"Automated n8n backup: $TIMESTAMP\"
                # git push origin main  # Uncomment to actually push when remote is configured
                echo \"Successfully backed up and committed on $HOST.\"
            else
                echo \"No changes to workflows on $HOST.\"
            fi
        else
            echo \"ERROR: Failed to export n8n workflows on $HOST.\"
        fi
    "
done

echo "n8n cluster backup process completed."
