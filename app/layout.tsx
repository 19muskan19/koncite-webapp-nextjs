import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import './globals.css'

const RootProviders = dynamic(() => import('@/components/RootProviders'), {
  ssr: true,
  loading: () => null,
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
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  )
}
