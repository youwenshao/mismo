export interface DataExportRequest {
  userId: string
  requestedAt: string
  status: 'pending' | 'processing' | 'completed'
}

export interface DeletionRequest {
  userId: string
  requestedAt: string
  status: 'pending' | 'processing' | 'completed' | 'verified'
}

export interface GDPRComplianceStatus {
  dataExportEndpoint: boolean
  dataDeletionEndpoint: boolean
  privacyPolicy: boolean
  cookieConsent: boolean
  dataProcessingAgreement: boolean
}

export function checkGDPRCompliance(
  appConfig: Record<string, unknown>,
): GDPRComplianceStatus {
  return {
    dataExportEndpoint: Boolean(appConfig['dataExportEndpoint']),
    dataDeletionEndpoint: Boolean(appConfig['dataDeletionEndpoint']),
    privacyPolicy: Boolean(appConfig['privacyPolicy']),
    cookieConsent: Boolean(appConfig['cookieConsent']),
    dataProcessingAgreement: Boolean(appConfig['dataProcessingAgreement']),
  }
}

export function generatePrivacyPolicyTemplate(
  appName: string,
  dataTypes: string[],
): string {
  const dataList = dataTypes.map((t) => `- ${t}`).join('\n')

  return `# Privacy Policy for ${appName}

_Last updated: ${new Date().toISOString().split('T')[0]}_

## 1. Introduction

Welcome to ${appName}. We are committed to protecting your personal data and your right to privacy.

## 2. Data We Collect

We collect and process the following types of personal data:

${dataList}

## 3. How We Use Your Data

We use your personal data only for the purposes described in this policy. We do not sell your data to third parties.

## 4. Data Retention

We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected. You may request deletion of your data at any time.

## 5. Your Rights Under GDPR

Under the General Data Protection Regulation, you have the right to:

- **Access** your personal data
- **Rectify** inaccurate personal data
- **Erase** your personal data ("right to be forgotten")
- **Restrict** processing of your personal data
- **Data portability** — receive your data in a structured, machine-readable format
- **Object** to processing of your personal data
- **Withdraw consent** at any time

## 6. Data Export

You may request a full export of your personal data at any time by contacting us or using the data export feature in your account settings.

## 7. Data Deletion

You may request complete deletion of your account and associated data. We will process deletion requests within 30 days and verify that all data has been removed.

## 8. Cookies

We use cookies to improve your experience. You can manage your cookie preferences at any time through our cookie consent interface.

## 9. Contact

If you have questions about this privacy policy or your personal data, please contact us at privacy@${appName.toLowerCase().replace(/\s+/g, '')}.com.
`
}
