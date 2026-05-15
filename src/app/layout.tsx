import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinTrack Pro — Reconciliation',
  description: 'Payment reconciliation dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div>
              <p className="text-sm font-medium text-slate-500">FinTrack Pro</p>
              <h1 className="text-xl font-semibold">Reconciliation</h1>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl">{children}</main>
      </body>
    </html>
  )
}
