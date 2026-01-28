import type { Metadata } from 'next'
import ClientThemeProvider from '@/components/ClientThemeProvider'
import { ToastProvider } from '@/contexts/ToastContext'
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
      <body>
        <ClientThemeProvider>
          {children}
        </ClientThemeProvider>
      </body>
    </html>
  )
}
