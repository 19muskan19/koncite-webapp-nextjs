import type { Metadata } from 'next'
import ClientThemeProvider from '@/components/ClientThemeProvider'
import { ToastProvider } from '@/contexts/ToastContext'
import { UserProvider } from '@/contexts/UserContext'
import { ProjectsProvider } from '@/contexts/ProjectsContext'
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
        <ClientThemeProvider>
          <UserProvider>
            <ProjectsProvider>
              {children}
            </ProjectsProvider>
          </UserProvider>
        </ClientThemeProvider>
      </body>
    </html>
  )
}
