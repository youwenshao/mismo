import { execSync } from 'child_process'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { CloudTransferConfig, DeployResult } from '../schema'

const TERRAFORM_BIN =
  process.env.TERRAFORM_BINARY_PATH ?? '/usr/local/bin/terraform'

function exec(cmd: string, cwd: string, env?: Record<string, string>): string {
  return execSync(cmd, {
    cwd,
    encoding: 'utf-8',
    timeout: 300_000,
    env: { ...process.env, ...env },
  })
}

export class CloudDeployer {
  async deploy(config: CloudTransferConfig): Promise<DeployResult> {
    if (config.provider === 'AWS') {
      return this.deployAws(config)
    }
    return this.deployGcp(config)
  }

  private async deployAws(config: CloudTransferConfig): Promise<DeployResult> {
    const workDir = this.prepareWorkDir(config)

    try {
      if (!config.existingTerraformDir) {
        this.generateAwsTerraform(workDir, config)
      }

      const tfDir = config.existingTerraformDir ?? workDir

      const credEnv: Record<string, string> = {}
      if (config.clientAwsAccessKey) {
        credEnv.AWS_ACCESS_KEY_ID = config.clientAwsAccessKey
      }
      if (config.clientAwsSecretKey) {
        credEnv.AWS_SECRET_ACCESS_KEY = config.clientAwsSecretKey
      }
      credEnv.AWS_DEFAULT_REGION = config.region

      exec(`${TERRAFORM_BIN} init -no-color`, tfDir, credEnv)

      const planOutput = exec(
        `${TERRAFORM_BIN} plan -no-color -out=tfplan`,
        tfDir,
        credEnv,
      )

      exec(
        `${TERRAFORM_BIN} apply -no-color -auto-approve tfplan`,
        tfDir,
        credEnv,
      )

      let outputs: Record<string, unknown> = {}
      try {
        const outputJson = exec(
          `${TERRAFORM_BIN} output -json`,
          tfDir,
          credEnv,
        )
        outputs = JSON.parse(outputJson)
      } catch {
        // outputs may not be configured
      }

      return {
        success: true,
        output: { terraformOutputs: outputs, planSummary: planOutput.slice(-500) },
        deploymentUrl: extractUrl(outputs),
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  private async deployGcp(config: CloudTransferConfig): Promise<DeployResult> {
    const workDir = this.prepareWorkDir(config)

    try {
      if (!config.existingTerraformDir) {
        this.generateGcpTerraform(workDir, config)
      }

      const tfDir = config.existingTerraformDir ?? workDir

      const credEnv: Record<string, string> = {}
      if (config.clientGcpServiceAccount) {
        const saPath = join(workDir, 'gcp-sa.json')
        writeFileSync(saPath, config.clientGcpServiceAccount)
        credEnv.GOOGLE_APPLICATION_CREDENTIALS = saPath
      }

      exec(`${TERRAFORM_BIN} init -no-color`, tfDir, credEnv)
      const planOutput = exec(
        `${TERRAFORM_BIN} plan -no-color -out=tfplan`,
        tfDir,
        credEnv,
      )
      exec(
        `${TERRAFORM_BIN} apply -no-color -auto-approve tfplan`,
        tfDir,
        credEnv,
      )

      let outputs: Record<string, unknown> = {}
      try {
        const outputJson = exec(
          `${TERRAFORM_BIN} output -json`,
          tfDir,
          credEnv,
        )
        outputs = JSON.parse(outputJson)
      } catch {
        // outputs may not be configured
      }

      return {
        success: true,
        output: { terraformOutputs: outputs, planSummary: planOutput.slice(-500) },
        deploymentUrl: extractUrl(outputs),
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  generateTerraform(
    provider: 'AWS' | 'GCP',
    config: CloudTransferConfig,
  ): Record<string, string> {
    const workDir = this.prepareWorkDir(config)
    if (provider === 'AWS') {
      this.generateAwsTerraform(workDir, config)
    } else {
      this.generateGcpTerraform(workDir, config)
    }

    const files: Record<string, string> = {}
    for (const name of ['main.tf', 'variables.tf', 'outputs.tf']) {
      const p = join(workDir, name)
      if (existsSync(p)) {
        files[name] = readFileSync(p, 'utf-8')
      }
    }
    return files
  }

  private prepareWorkDir(config: CloudTransferConfig): string {
    const base = process.env.REPO_SURGERY_WORKSPACE ?? '/tmp/mismo-hosting'
    const dir = join(base, `tf-${Date.now()}`)
    mkdirSync(dir, { recursive: true })
    return dir
  }

  private generateAwsTerraform(
    dir: string,
    config: CloudTransferConfig,
  ): void {
    const { resources } = config
    const blocks: string[] = []
    const varBlocks: string[] = []
    const outputBlocks: string[] = []

    blocks.push(`
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}`)

    varBlocks.push(`
variable "aws_region" {
  default = "${config.region}"
}`)

    if (resources.s3) {
      blocks.push(`
resource "aws_s3_bucket" "app" {
  bucket = "${resources.s3.bucketName}"
}

resource "aws_s3_bucket_versioning" "app" {
  bucket = aws_s3_bucket.app.id
  versioning_configuration {
    status = "${resources.s3.versioning ? 'Enabled' : 'Suspended'}"
  }
}

resource "aws_s3_bucket_public_access_block" "app" {
  bucket                  = aws_s3_bucket.app.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`)

      outputBlocks.push(`
output "s3_bucket_name" {
  value = aws_s3_bucket.app.bucket
}`)
    }

    if (resources.cloudfront && resources.s3) {
      blocks.push(`
resource "aws_cloudfront_origin_access_identity" "app" {}

resource "aws_cloudfront_distribution" "app" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "${resources.cloudfront.priceClass}"

  origin {
    domain_name = aws_s3_bucket.app.bucket_regional_domain_name
    origin_id   = "s3-origin"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.app.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}`)

      outputBlocks.push(`
output "cloudfront_domain" {
  value = aws_cloudfront_distribution.app.domain_name
}

output "deployment_url" {
  value = "https://\${aws_cloudfront_distribution.app.domain_name}"
}`)
    }

    if (resources.rds) {
      blocks.push(`
resource "aws_db_instance" "app" {
  identifier           = "${resources.rds.dbName}"
  engine               = "${resources.rds.engine}"
  instance_class       = "${resources.rds.instanceClass}"
  allocated_storage    = ${resources.rds.allocatedStorage}
  db_name              = "${resources.rds.dbName}"
  username             = "admin"
  password             = var.db_password
  skip_final_snapshot  = true
  publicly_accessible  = false
}`)

      varBlocks.push(`
variable "db_password" {
  sensitive = true
}`)

      outputBlocks.push(`
output "rds_endpoint" {
  value = aws_db_instance.app.endpoint
}`)
    }

    if (resources.compute) {
      if (resources.compute.type === 'ec2') {
        blocks.push(`
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "${resources.compute.instanceType}"

  tags = {
    Name = "mismo-app"
  }
}`)
        outputBlocks.push(`
output "ec2_public_ip" {
  value = aws_instance.app.public_ip
}`)
      } else {
        blocks.push(`
resource "aws_ecs_cluster" "app" {
  name = "mismo-app"
}

resource "aws_ecs_task_definition" "app" {
  family                   = "mismo-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "${resources.compute.cpu}"
  memory                   = "${resources.compute.memory}"

  container_definitions = jsonencode([{
    name      = "app"
    image     = "${resources.compute.containerImage ?? 'nginx:latest'}"
    essential = true
    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
    }]
  }])
}`)
      }
    }

    for (const [k, v] of Object.entries(config.terraformVars)) {
      varBlocks.push(`
variable "${k}" {
  default = "${v}"
}`)
    }

    writeFileSync(join(dir, 'main.tf'), blocks.join('\n'))
    writeFileSync(join(dir, 'variables.tf'), varBlocks.join('\n'))
    writeFileSync(join(dir, 'outputs.tf'), outputBlocks.join('\n'))
  }

  private generateGcpTerraform(
    dir: string,
    config: CloudTransferConfig,
  ): void {
    const { resources } = config
    const blocks: string[] = []
    const varBlocks: string[] = []
    const outputBlocks: string[] = []

    blocks.push(`
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  region  = var.gcp_region
  project = var.gcp_project
}`)

    varBlocks.push(`
variable "gcp_region" {
  default = "${config.region}"
}

variable "gcp_project" {
  type = string
}`)

    if (resources.s3) {
      blocks.push(`
resource "google_storage_bucket" "app" {
  name     = "${resources.s3.bucketName}"
  location = var.gcp_region

  versioning {
    enabled = ${resources.s3.versioning}
  }

  uniform_bucket_level_access = true
}`)

      outputBlocks.push(`
output "bucket_name" {
  value = google_storage_bucket.app.name
}`)
    }

    if (resources.rds) {
      const gcpTier =
        resources.rds.instanceClass === 'db.t3.micro'
          ? 'db-f1-micro'
          : 'db-custom-1-3840'

      blocks.push(`
resource "google_sql_database_instance" "app" {
  name             = "${resources.rds.dbName}"
  database_version = "${resources.rds.engine === 'postgres' ? 'POSTGRES_15' : 'MYSQL_8_0'}"
  region           = var.gcp_region

  settings {
    tier = "${gcpTier}"

    ip_configuration {
      ipv4_enabled = true
    }
  }

  deletion_protection = false
}

resource "google_sql_database" "app" {
  name     = "${resources.rds.dbName}"
  instance = google_sql_database_instance.app.name
}`)

      outputBlocks.push(`
output "sql_connection_name" {
  value = google_sql_database_instance.app.connection_name
}`)
    }

    if (resources.compute?.type === 'cloud-run') {
      blocks.push(`
resource "google_cloud_run_service" "app" {
  name     = "mismo-app"
  location = var.gcp_region

  template {
    spec {
      containers {
        image = "${resources.compute.containerImage ?? 'gcr.io/cloudrun/hello'}"
        resources {
          limits = {
            cpu    = "${resources.compute.cpu}m"
            memory = "${resources.compute.memory}Mi"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

resource "google_cloud_run_service_iam_member" "public" {
  service  = google_cloud_run_service.app.name
  location = google_cloud_run_service.app.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}`)

      outputBlocks.push(`
output "deployment_url" {
  value = google_cloud_run_service.app.status[0].url
}`)
    }

    for (const [k, v] of Object.entries(config.terraformVars)) {
      varBlocks.push(`
variable "${k}" {
  default = "${v}"
}`)
    }

    writeFileSync(join(dir, 'main.tf'), blocks.join('\n'))
    writeFileSync(join(dir, 'variables.tf'), varBlocks.join('\n'))
    writeFileSync(join(dir, 'outputs.tf'), outputBlocks.join('\n'))
  }
}

function extractUrl(outputs: Record<string, unknown>): string | undefined {
  const urlOutput = outputs.deployment_url as
    | { value?: string }
    | undefined
  if (urlOutput?.value) return urlOutput.value

  const cfOutput = outputs.cloudfront_domain as
    | { value?: string }
    | undefined
  if (cfOutput?.value) return `https://${cfOutput.value}`

  return undefined
}
