import type { Metadata } from 'next'
import { ConvexClientProvider } from '@/components/ConvexClientProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Author - Long-form Writing App',
  description: 'An AI-native writing app built with TipTap',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  )
}
