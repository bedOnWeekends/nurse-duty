import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '간호사 근무표 생성기',
  description: '간호사 근무표를 생성하는 웹 애플리케이션입니다.',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
