import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Background blobs */}
      <div className="blob-1" />
      <div className="blob-2" />
      <div className="blob-3" />

      {/* Sidebar */}
      <Sidebar role={session.user.role} fullName={session.user.name || session.user.username} />

      {/* Main content */}
      <main className="relative z-10 lg:pl-56 pb-16 lg:pb-0 min-h-screen w-full">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <BottomNav />
    </div>
  )
}
