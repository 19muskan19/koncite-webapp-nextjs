import type { Metadata } from 'next'
import RootProviders from '@/components/RootProviders'
import './globals.css'

export const metadata: Metadata = {
  title: 'KONCITE - Construction Platform',
  description: 'Construction management platform',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  )
}
