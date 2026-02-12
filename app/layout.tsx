import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import ClientThemeProvider from '@/components/ClientThemeProvider'
import { ToastProvider } from '@/contexts/ToastContext'
import { UserProvider } from '@/contexts/UserContext'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

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
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className={inter.className}>
        <ClientThemeProvider>
          <ToastProvider>
            <UserProvider>
              {children}
            </UserProvider>
          </ToastProvider>
        </ClientThemeProvider>
      </body>
    </html>
  )
}
