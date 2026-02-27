#!/bin/bash
# supabase-backup.sh - Dumps Supabase DB and syncs to Studio 3

DB_URL="postgresql://postgres:postgres@localhost:5432/postgres" # Update to real DB URL if hosted
TARGET_HOST="studio-3"
TARGET_DIR="/Volumes/1TB_Storage/supabase_backups" # Assuming a 1TB external drive
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="supabase_backup_${TIMESTAMP}.sql.gz"
LOCAL_TMP_DIR="/tmp/supabase_backups"

echo "Starting Supabase backup: $TIMESTAMP"

# Create local temp dir
mkdir -p "$LOCAL_TMP_DIR"

# Ensure target directory exists on Studio 3
ssh admin@$TARGET_HOST "mkdir -p $TARGET_DIR"

# Dump the database
echo "Dumping database..."
pg_dump --clean --if-exists --quote-all-identifiers \
    -d "$DB_URL" | gzip > "$LOCAL_TMP_DIR/$FILENAME"

if [ $? -eq 0 ]; then
    echo "Database dumped successfully to $LOCAL_TMP_DIR/$FILENAME"
    
    # Sync to Studio 3
    echo "Transferring backup to $TARGET_HOST..."
    rsync -avz "$LOCAL_TMP_DIR/$FILENAME" admin@$TARGET_HOST:"$TARGET_DIR/"
    
    if [ $? -eq 0 ]; then
        echo "Backup transferred successfully."
        # Clean up local temp file
        rm "$LOCAL_TMP_DIR/$FILENAME"
        
        # Keep only the last 7 days of backups on Studio 3 to save space
        ssh admin@$TARGET_HOST "find $TARGET_DIR -name 'supabase_backup_*.sql.gz' -type f -mtime +7 -delete"
        echo "Old backups cleaned up on $TARGET_HOST."
    else
        echo "ERROR: Failed to transfer backup to $TARGET_HOST"
        exit 1
    fi
else
    echo "ERROR: Database dump failed."
    exit 1
fi

echo "Backup process completed."
