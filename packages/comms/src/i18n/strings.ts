export type Locale = 'en' | 'zh'

interface LocaleStrings {
  greeting: (name: string) => string
  buildStarted: {
    subject: (projectName: string) => string
    heading: string
    body: (projectName: string, stage: string) => string
    expectUpdate: string
  }
  buildProgress: {
    subject: (projectName: string, percent: number) => string
    heading: string
    body: (projectName: string, percent: number, detail: string) => string
    currentStep: (step: string) => string
    estimated: (time: string) => string
  }
  buildComplete: {
    subject: (projectName: string) => string
    heading: string
    body: (projectName: string) => string
    viewDelivery: string
  }
  transferReady: {
    subject: (projectName: string) => string
    heading: string
    body: (projectName: string) => string
    repoLabel: string
    hostingLabel: string
    docsLabel: string
    videoLabel: string
  }
  supportRequired: {
    subject: (projectName: string) => string
    heading: string
    body: (projectName: string, reason: string) => string
    teamNotified: string
  }
  feedbackRequest: {
    subject: (projectName: string) => string
    heading: string
    body: (projectName: string) => string
    ratePrompt: string
    bugReport: string
  }
  footer: {
    company: string
    unsubscribe: string
  }
}

const en: LocaleStrings = {
  greeting: (name) => `Hi ${name},`,
  buildStarted: {
    subject: (p) => `Your project "${p}" has started building`,
    heading: 'Build Started',
    body: (p, stage) =>
      `Your project "${p}" is now being built. We've started with ${stage} — expect your first progress update within the hour.`,
    expectUpdate: 'We\'ll keep you posted as each stage completes.',
  },
  buildProgress: {
    subject: (p, pct) => `"${p}" is ${pct}% complete`,
    heading: 'Build Progress Update',
    body: (p, pct, detail) =>
      `Good news — "${p}" is ${pct}% complete. ${detail}.`,
    currentStep: (step) => `Currently working on: ${step}`,
    estimated: (time) => `Estimated completion: ${time}`,
  },
  buildComplete: {
    subject: (p) => `"${p}" build is complete`,
    heading: 'Build Complete',
    body: (p) =>
      `Great news — your project "${p}" has been successfully built and all validations have passed. We're now preparing your delivery package.`,
    viewDelivery: 'View Delivery Package',
  },
  transferReady: {
    subject: (p) => `"${p}" is ready for transfer`,
    heading: 'Your Project is Ready',
    body: (p) =>
      `Everything for "${p}" is packaged and ready for you. Below you'll find your repository, documentation, and walkthrough video.`,
    repoLabel: 'GitHub Repository',
    hostingLabel: 'Live URL',
    docsLabel: 'Documentation',
    videoLabel: 'Walkthrough Video',
  },
  supportRequired: {
    subject: (p) => `Action needed: "${p}" requires attention`,
    heading: 'Support Required',
    body: (p, reason) =>
      `We've encountered an issue with "${p}" that needs attention: ${reason}. Our team has been notified and will reach out shortly.`,
    teamNotified: 'Our engineering team has been notified and will follow up within 24 hours.',
  },
  feedbackRequest: {
    subject: (p) => `How did we do on "${p}"?`,
    heading: 'We\'d Love Your Feedback',
    body: (p) =>
      `Your project "${p}" has been delivered. We'd love to hear how we did — your feedback helps us improve.`,
    ratePrompt: 'Rate your experience (1-10):',
    bugReport: 'Found a bug? Report it here',
  },
  footer: {
    company: 'Mismo',
    unsubscribe: 'Manage notification preferences',
  },
}

const zh: LocaleStrings = {
  greeting: (name) => `${name} 您好，`,
  buildStarted: {
    subject: (p) => `您的项目「${p}」已开始构建`,
    heading: '构建已启动',
    body: (p, stage) =>
      `您的项目「${p}」已开始构建。我们正在进行${stage}，预计一小时内发送首次进度更新。`,
    expectUpdate: '每个阶段完成后，我们会及时通知您。',
  },
  buildProgress: {
    subject: (p, pct) => `「${p}」已完成 ${pct}%`,
    heading: '构建进度更新',
    body: (p, pct, detail) =>
      `好消息——「${p}」已完成 ${pct}%。${detail}。`,
    currentStep: (step) => `当前进行中：${step}`,
    estimated: (time) => `预计完成时间：${time}`,
  },
  buildComplete: {
    subject: (p) => `「${p}」构建已完成`,
    heading: '构建完成',
    body: (p) =>
      `好消息——您的项目「${p}」已成功构建，所有验证均已通过。我们正在准备交付包。`,
    viewDelivery: '查看交付包',
  },
  transferReady: {
    subject: (p) => `「${p}」已准备好交付`,
    heading: '您的项目已就绪',
    body: (p) =>
      `「${p}」的所有内容已打包完毕。以下是您的代码仓库、文档和演示视频。`,
    repoLabel: 'GitHub 仓库',
    hostingLabel: '线上地址',
    docsLabel: '文档',
    videoLabel: '演示视频',
  },
  supportRequired: {
    subject: (p) => `需要处理：「${p}」需要关注`,
    heading: '需要支持',
    body: (p, reason) =>
      `我们在「${p}」中遇到了需要关注的问题：${reason}。团队已收到通知，将尽快与您联系。`,
    teamNotified: '我们的工程团队已收到通知，将在 24 小时内跟进。',
  },
  feedbackRequest: {
    subject: (p) => `「${p}」做得怎么样？`,
    heading: '期待您的反馈',
    body: (p) =>
      `您的项目「${p}」已交付完成。希望了解您的体验——您的反馈有助于我们改进。`,
    ratePrompt: '请为您的体验评分（1-10）：',
    bugReport: '发现问题？在此报告',
  },
  footer: {
    company: 'Mismo',
    unsubscribe: '管理通知偏好',
  },
}

const locales: Record<Locale, LocaleStrings> = { en, zh }

export function getStrings(locale: Locale): LocaleStrings {
  return locales[locale] ?? locales.en
}

export type { LocaleStrings }
