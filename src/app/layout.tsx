import type { Metadata, Viewport } from 'next'
import { Fira_Mono, Mulish } from 'next/font/google'
import './globals.css'

/** Nimiq official UI face (Google renamed Muli → Mulish). */
const mulish = Mulish({
  variable: '--font-mulish',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
})

/** Nimiq official mono for addresses / amounts / codes. */
const firaMono = Fira_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: 'Tab',
  description: 'Split the bill. Settled at the table.',
  openGraph: {
    title: 'Tab',
    description: 'Split the bill. Settled at the table.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FBFAF7',
  /** Keep layout above keyboard / chrome when the OS supports it */
  interactiveWidget: 'resizes-content',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${mulish.variable} ${firaMono.variable} h-full`}>
      <body className={`${mulish.className} h-full antialiased`}>{children}</body>
    </html>
  )
}
