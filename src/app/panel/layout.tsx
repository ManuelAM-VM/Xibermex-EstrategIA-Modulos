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
        marginLeft: isMobile ? 0 : '200px',
        paddingTop: isMobile ? '52px' : 0,
        // 56px nav + safe area iPhone (barra de inicio)
        paddingBottom: isMobile ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : 0,
        minHeight: '100vh',
        overflow: 'auto',
      }}>
        {children}
      </main>
    </div>
  )
}
