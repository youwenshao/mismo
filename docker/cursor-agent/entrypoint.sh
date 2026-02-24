#!/bin/bash
echo "Cursor Agent Container Started"
echo "Project: $PROJECT_DIR"
echo "Task: $TASK_DESCRIPTION"
# In production: cursor agent --task "$TASK_DESCRIPTION" --rules .cursorrules
exec "$@"
