import type { SelfHostedConfig, DeployResult } from '../schema'

export class SelfHostedDeployer {
  deploy(config: SelfHostedConfig): DeployResult {
    try {
      const artifacts: Record<string, string> = {}

      artifacts['docker-compose.yml'] = this.generateDockerCompose(config)
      artifacts['install.sh'] = this.generateInstallScript(config)
      artifacts['traefik/traefik.yml'] = this.generateTraefikStaticConfig(config)
      artifacts['traefik/dynamic.yml'] = this.generateTraefikDynamicConfig(config)
      artifacts['.env.example'] = this.generateEnvTemplate(config)

      if (config.backupS3Bucket) {
        artifacts['backup.sh'] = this.generateBackupScript(config)
        artifacts['crontab'] = this.generateBackupCron(config)
      }

      artifacts['README.md'] = this.generateReadme(config)

      return {
        success: true,
        artifacts,
        output: { provider: 'self-hosted', domain: config.domain },
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  generateDockerCompose(config: SelfHostedConfig): string {
    const services: string[] = []

    services.push(`  traefik:
    image: traefik:v3.0
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/dynamic.yml:/etc/traefik/dynamic.yml:ro
      - traefik-certs:/letsencrypt
    networks:
      - web`)

    const appLabels = [
      '"traefik.enable=true"',
      `"traefik.http.routers.app.rule=Host(\\\`${config.domain}\\\`)"`,
      '"traefik.http.routers.app.entrypoints=websecure"',
      '"traefik.http.routers.app.tls.certresolver=letsencrypt"',
      `"traefik.http.services.app.loadbalancer.server.port=${config.appPort}"`,
    ]

    services.push(`  app:
    image: \${APP_IMAGE:-app:latest}
    restart: always
    env_file: .env
    labels:
      - ${appLabels.join('\n      - ')}
    networks:
      - web
      - internal
    depends_on:${config.needsDatabase ? '\n      - postgres' : ''}${config.needsRedis ? '\n      - redis' : ''}
      - traefik`)

    if (config.needsDatabase) {
      services.push(`  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: \${POSTGRES_DB:-app}
      POSTGRES_USER: \${POSTGRES_USER:-app}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER:-app}"]
      interval: 10s
      timeout: 5s
      retries: 5`)
    }

    if (config.needsRedis) {
      services.push(`  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass \${REDIS_PASSWORD:?REDIS_PASSWORD required}
    volumes:
      - redis-data:/data
    networks:
      - internal
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5`)
    }

    const volumes = ['traefik-certs:']
    if (config.needsDatabase) volumes.push('postgres-data:')
    if (config.needsRedis) volumes.push('redis-data:')

    return `version: "3.8"

services:
${services.join('\n\n')}

volumes:
  ${volumes.join('\n  ')}

networks:
  web:
    driver: bridge
  internal:
    driver: bridge
`
  }

  generateInstallScript(config: SelfHostedConfig): string {
    return `#!/usr/bin/env bash
set -euo pipefail

echo "=== Mismo Self-Hosted Installer ==="
echo "Domain: ${config.domain}"
echo ""

check_prerequisites() {
  local missing=0

  if ! command -v docker &>/dev/null; then
    echo "ERROR: Docker is not installed. Install from https://docs.docker.com/engine/install/"
    missing=1
  fi

  if ! command -v docker compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
    echo "ERROR: Docker Compose is not installed."
    missing=1
  fi

  if ! command -v curl &>/dev/null; then
    echo "ERROR: curl is not installed."
    missing=1
  fi

  if [ "$missing" -eq 1 ]; then
    echo ""
    echo "Please install the missing prerequisites and try again."
    exit 1
  fi

  echo "All prerequisites satisfied."
}

setup_directories() {
  echo "Setting up directories..."
  mkdir -p traefik
  chmod 600 traefik/traefik.yml traefik/dynamic.yml 2>/dev/null || true
}

setup_env() {
  if [ ! -f .env ]; then
    echo "Creating .env from template..."
    cp .env.example .env
    echo ""
    echo "IMPORTANT: Edit .env and fill in your values before starting."
    echo "  nano .env"
    echo ""
    read -rp "Press Enter once .env is configured, or Ctrl+C to abort... "
  else
    echo ".env already exists, skipping."
  fi
}

start_services() {
  echo "Pulling images..."
  docker compose pull

  echo "Starting services..."
  docker compose up -d

  echo ""
  echo "Waiting for services to be healthy..."
  sleep 10

  docker compose ps
}

verify() {
  echo ""
  echo "Verifying deployment..."

  local retries=0
  local max_retries=12

  while [ "$retries" -lt "$max_retries" ]; do
    if curl -sf "https://${config.domain}" -o /dev/null 2>/dev/null; then
      echo "Deployment verified: https://${config.domain} is live."
      return 0
    fi
    retries=$((retries + 1))
    echo "  Waiting for SSL certificate... (attempt $retries/$max_retries)"
    sleep 10
  done

  echo "WARNING: Could not verify deployment. Check logs with: docker compose logs"
  return 1
}

check_prerequisites
setup_directories
setup_env
start_services
verify

echo ""
echo "=== Installation Complete ==="
echo "Your app is running at: https://${config.domain}"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f      # View logs"
echo "  docker compose restart app  # Restart app"
echo "  docker compose down         # Stop all services"
echo "  docker compose up -d        # Start all services"
`
  }

  generateTraefikStaticConfig(config: SelfHostedConfig): string {
    return `api:
  dashboard: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    exposedByDefault: false
  file:
    filename: /etc/traefik/dynamic.yml

certificatesResolvers:
  letsencrypt:
    acme:
      email: ${config.email}
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
`
  }

  generateTraefikDynamicConfig(config: SelfHostedConfig): string {
    return `http:
  middlewares:
    security-headers:
      headers:
        browserXssFilter: true
        contentTypeNosniff: true
        frameDeny: true
        stsIncludeSubdomains: true
        stsPreload: true
        stsSeconds: 31536000
        customFrameOptionsValue: "SAMEORIGIN"

    rate-limit:
      rateLimit:
        average: 100
        burst: 50
`
  }

  private generateEnvTemplate(config: SelfHostedConfig): string {
    const lines = [
      '# ===========================================',
      '# Self-Hosted Environment Variables',
      '# Generated by Mismo',
      '# ===========================================',
      '',
      `# App`,
      `APP_IMAGE=${config.appImage ?? 'app:latest'}`,
      `APP_PORT=${config.appPort}`,
      `DOMAIN=${config.domain}`,
      '',
    ]

    if (config.needsDatabase) {
      lines.push('# PostgreSQL')
      lines.push('POSTGRES_DB=app')
      lines.push('POSTGRES_USER=app')
      lines.push('POSTGRES_PASSWORD=')
      lines.push(`DATABASE_URL=postgresql://app:\${POSTGRES_PASSWORD}@postgres:5432/app`)
      lines.push('')
    }

    if (config.needsRedis) {
      lines.push('# Redis')
      lines.push('REDIS_PASSWORD=')
      lines.push(`REDIS_URL=redis://default:\${REDIS_PASSWORD}@redis:6379`)
      lines.push('')
    }

    for (const v of config.envVars) {
      lines.push(`${v.key}=${v.sensitive ? '' : v.value}`)
    }

    return lines.join('\n')
  }

  private generateBackupScript(config: SelfHostedConfig): string {
    return `#!/usr/bin/env bash
set -euo pipefail

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/tmp/mismo-backup-\${BACKUP_DATE}"

mkdir -p "\${BACKUP_DIR}"

echo "[\${BACKUP_DATE}] Starting backup..."

${
  config.needsDatabase
    ? `echo "Backing up PostgreSQL..."
docker compose exec -T postgres pg_dumpall -U "\${POSTGRES_USER:-app}" > "\${BACKUP_DIR}/db.sql"
gzip "\${BACKUP_DIR}/db.sql"
`
    : ''
}
echo "Backing up volumes..."
docker run --rm \\
  -v mismo_traefik-certs:/source:ro \\
  -v "\${BACKUP_DIR}":/backup \\
  alpine tar czf /backup/traefik-certs.tar.gz -C /source .

${
  config.backupS3Bucket
    ? `echo "Uploading to S3..."
aws s3 sync "\${BACKUP_DIR}" "s3://${config.backupS3Bucket}/backups/\${BACKUP_DATE}/" --quiet
`
    : ''
}

rm -rf "\${BACKUP_DIR}"
echo "[\${BACKUP_DATE}] Backup complete."
`
  }

  private generateBackupCron(config: SelfHostedConfig): string {
    return `# Mismo automated backups
${config.backupSchedule} cd /opt/mismo && bash backup.sh >> /var/log/mismo-backup.log 2>&1
`
  }

  private generateReadme(config: SelfHostedConfig): string {
    return `# Self-Hosted Deployment

Built and packaged by Mismo.

## Quick Start

\`\`\`bash
chmod +x install.sh
./install.sh
\`\`\`

## Requirements

- Docker >= 20.10
- Docker Compose >= 2.0
- A domain pointing to your server (${config.domain})
- Ports 80 and 443 open

## Architecture

- **Traefik**: Reverse proxy with automatic Let's Encrypt SSL
- **App**: Your application container
${config.needsDatabase ? '- **PostgreSQL**: Database server\n' : ''}${config.needsRedis ? '- **Redis**: Cache/queue server\n' : ''}

## SSL

SSL certificates are automatically provisioned via Let's Encrypt.
The ACME challenge is handled over HTTP on port 80 and redirects to HTTPS.

## Backups

${
  config.backupS3Bucket
    ? `Automated backups run on schedule: \`${config.backupSchedule}\`
Backups are uploaded to: \`s3://${config.backupS3Bucket}/backups/\`

To run a manual backup:
\`\`\`bash
bash backup.sh
\`\`\``
    : 'Configure `backupS3Bucket` to enable automated backups.'
}

## Commands

| Command | Description |
|---------|-------------|
| \`docker compose up -d\` | Start all services |
| \`docker compose down\` | Stop all services |
| \`docker compose logs -f\` | View live logs |
| \`docker compose restart app\` | Restart the app |
| \`docker compose pull && docker compose up -d\` | Update images |
`
  }
}
