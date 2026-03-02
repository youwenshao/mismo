#!/usr/bin/env bash
set -e

# Setup base directory
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "n8n High-Availability Deployment Script"
echo "========================================="

# Role Selection
echo "Select the role for this Mac node:"
echo "1) Studio 1 (Control Plane - Main node)"
echo "2) Studio 2 or 3 (Execution Plane - Worker node)"
read -p "Enter selection [1 or 2]: " role_selection

case $role_selection in
    1)
        role="main"
        compose_file="docker/n8n-ha/docker-compose.main.yml"
        echo "Configuring as Studio 1 (Main Node)..."
        ;;
    2)
        role="worker"
        compose_file="docker/n8n-ha/docker-compose.worker.yml"
        echo "Configuring as Studio 2/3 (Worker Node)..."
        ;;
    *)
        echo "Invalid selection. Exiting."
        exit 1
        ;;
esac

# Environment Initialization
ENV_FILE="docker/n8n-ha/.env"
EXAMPLE_ENV="docker/n8n-ha/.env.example"

if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env from .env.example..."
    cp "$EXAMPLE_ENV" "$ENV_FILE"
    
    # Secure Key Generation
    if grep -q "N8N_ENCRYPTION_KEY=your_shared_encryption_key_here" "$ENV_FILE"; then
        echo "Generating secure N8N_ENCRYPTION_KEY..."
        # Replace the placeholder with a secure 32-char hex key
        NEW_KEY=$(openssl rand -hex 16)
        # Use sed to replace the key in the .env file
        # Check OS for sed compatibility
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/N8N_ENCRYPTION_KEY=your_shared_encryption_key_here/N8N_ENCRYPTION_KEY=$NEW_KEY/" "$ENV_FILE"
        else
            sed -i "s/N8N_ENCRYPTION_KEY=your_shared_encryption_key_here/N8N_ENCRYPTION_KEY=$NEW_KEY/" "$ENV_FILE"
        fi
        echo "Secure N8N_ENCRYPTION_KEY generated and saved to $ENV_FILE"
    fi
    
    echo "Please edit $ENV_FILE and fill in the required API keys (Supabase, Postgres, Redis)."
    echo "Wait, checking for critical variables..."
fi

# Mandatory verification of .env variables
check_var() {
    local var_name=$1
    local placeholder=$2
    if grep -q "$var_name=$placeholder" "$ENV_FILE" || ! grep -q "$var_name=" "$ENV_FILE"; then
        echo "Warning: $var_name is not configured in $ENV_FILE"
        return 1
    fi
}

check_var "POSTGRES_PASSWORD" "your_db_password" || true
check_var "REDIS_PASSWORD" "your_redis_password" || true
check_var "SUPABASE_URL" "https://your-project-id.supabase.co" || true
check_var "SUPABASE_SERVICE_ROLE_KEY" "your-supabase-service-role-key" || true

if [ "$role" == "worker" ]; then
    check_var "MAIN_NODE_IP" "192.168.1.100" || true
fi

if [ "$role" == "main" ]; then
    echo "Note: Farm-monitor (agent farm monitoring) will start with n8n-main."
    echo "      For P0 alerts (SMS/phone), set TWILIO_*, ALERT_PHONE_NUMBER, SLACK_ALERT_WEBHOOK_URL in docker/n8n-ha/.env"
fi

# Build and Launch
echo ""
echo "Building microservices and starting n8n HA ($role mode)..."

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing project dependencies..."
    pnpm install
fi

# Launch Docker Compose
docker compose -f "$compose_file" up -d --build

echo ""
echo "Deployment successful!"
if [ "$role" == "main" ]; then
    echo "Access n8n at http://localhost:5678"
    echo "Farm-monitor is running (monitors RAM/CPU/disk, API health, build failures, security)."
    echo "To deploy resource-watchdog on all Studios: cd mac-studios-iac/ansible && ansible-playbook setup-monitoring.yml -K"
else
    echo "Worker node is now running and connected to Studio 1."
fi
echo "Refer to docker/n8n-ha/DEPLOYMENT.md for more details."
