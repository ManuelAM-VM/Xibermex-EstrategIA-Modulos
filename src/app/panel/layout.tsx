'use client'

import Sidebar from '@/components/Sidebar'
import { useIsMobile } from '@/hooks/useIsMobile'

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f0f13' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        // Desktop: offset del sidebar fijo
        marginLeft: isMobile ? 0 : '220px',
        // Mobile: padding top (topbar) + bottom (bottom nav)
        paddingTop:    isMobile ? '52px' : 0,
        paddingBottom: isMobile ? '56px' : 0,
        minHeight: '100vh',
        overflow: 'auto',
      }}>
        {children}
      </main>
    </div>
  )
}
