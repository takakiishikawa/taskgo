import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { DesignTokens, Toaster } from '@takaki/go-design-system'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TaskGo',
  description: 'PdMの設計貯金を守るツール',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ja"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <DesignTokens primaryColor="#5E6AD2" primaryColorHover="#4F5BC0" />
      </head>
      <body className="min-h-full">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
