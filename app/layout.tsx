import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zidny — Gestionnaire de tâches',
  description: 'Plateforme de gestion de tâches pour votre équipe',
  manifest: '/manifest.json',
  other: { 'theme-color': '#2AA4E7' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.dataset.theme='dark'}catch(e){}` }} />
        <link rel="icon" href="/zidny-icon.svg" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Zidny" />
      </head>
      <body className="min-h-full antialiased">
        <SessionProvider>
          <ServiceWorkerRegistrar />
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
