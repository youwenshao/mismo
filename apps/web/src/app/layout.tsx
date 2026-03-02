import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mismo -- Your Technical Co-Founder',
  description:
    'Transform your idea into a production-ready web application with AI-powered development.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="min-h-full">
      <body className="min-h-full">{children}</body>
    </html>
  )
}
