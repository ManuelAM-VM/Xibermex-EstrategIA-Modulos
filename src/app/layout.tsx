import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EstrategIA - Gestión de Módulos',
  description: 'Sistema de gestión de módulos y pagos para equipos de desarrollo',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
