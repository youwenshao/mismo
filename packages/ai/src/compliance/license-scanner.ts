export interface LicenseInfo {
  package: string
  version: string
  license: string
  licenseType: 'permissive' | 'copyleft' | 'proprietary' | 'unknown'
  requiresAttribution: boolean
}

export interface LicenseScanResult {
  packages: LicenseInfo[]
  copyleftPackages: LicenseInfo[]
  unknownPackages: LicenseInfo[]
  attributionDoc: string
}

const PERMISSIVE_LICENSES = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
])

const COPYLEFT_LICENSES = new Set([
  'GPL-2.0',
  'GPL-2.0-only',
  'GPL-2.0-or-later',
  'GPL-3.0',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'AGPL-3.0',
  'AGPL-3.0-only',
  'AGPL-3.0-or-later',
  'LGPL-2.1',
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'LGPL-3.0',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'MPL-2.0',
])

const ATTRIBUTION_REQUIRED = new Set([
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'MIT',
  ...COPYLEFT_LICENSES,
])

export function classifyLicense(license: string): LicenseInfo['licenseType'] {
  const normalized = license.trim()
  if (PERMISSIVE_LICENSES.has(normalized)) return 'permissive'
  if (COPYLEFT_LICENSES.has(normalized)) return 'copyleft'
  if (/proprietary|commercial|unlicensed/i.test(normalized)) return 'proprietary'
  return 'unknown'
}

export function generateAttributionDoc(packages: LicenseInfo[]): string {
  const lines: string[] = [
    '# Third-Party Attribution',
    '',
    'This document lists all third-party packages used in this project along with their license information.',
    '',
    '---',
    '',
  ]

  const grouped = new Map<string, LicenseInfo[]>()
  for (const pkg of packages) {
    const list = grouped.get(pkg.license) ?? []
    list.push(pkg)
    grouped.set(pkg.license, list)
  }

  for (const [license, pkgs] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`## ${license}`, '')
    for (const pkg of pkgs.sort((a, b) => a.package.localeCompare(b.package))) {
      lines.push(`- **${pkg.package}** v${pkg.version}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function scanDependencies(packageJson: {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}): LicenseScanResult {
  const allDeps: Record<string, string> = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  const packages: LicenseInfo[] = Object.entries(allDeps).map(([name, version]) => {
    const versionClean = version.replace(/^[\^~>=<]+/, '')
    const licenseType = 'unknown' as LicenseInfo['licenseType']

    return {
      package: name,
      version: versionClean,
      license: 'UNKNOWN',
      licenseType,
      requiresAttribution: false,
    }
  })

  const copyleftPackages = packages.filter((p) => p.licenseType === 'copyleft')
  const unknownPackages = packages.filter((p) => p.licenseType === 'unknown')
  const attributionDoc = generateAttributionDoc(packages.filter((p) => p.requiresAttribution))

  return { packages, copyleftPackages, unknownPackages, attributionDoc }
}

export function scanWithKnownLicenses(
  packageJson: {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  },
  knownLicenses: Record<string, string>,
): LicenseScanResult {
  const allDeps: Record<string, string> = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  const packages: LicenseInfo[] = Object.entries(allDeps).map(([name, version]) => {
    const versionClean = version.replace(/^[\^~>=<]+/, '')
    const license = knownLicenses[name] ?? 'UNKNOWN'
    const licenseType = classifyLicense(license)

    return {
      package: name,
      version: versionClean,
      license,
      licenseType,
      requiresAttribution: ATTRIBUTION_REQUIRED.has(license),
    }
  })

  const copyleftPackages = packages.filter((p) => p.licenseType === 'copyleft')
  const unknownPackages = packages.filter((p) => p.licenseType === 'unknown')
  const attributionDoc = generateAttributionDoc(packages.filter((p) => p.requiresAttribution))

  return { packages, copyleftPackages, unknownPackages, attributionDoc }
}
