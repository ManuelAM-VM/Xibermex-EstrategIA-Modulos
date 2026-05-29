'use client'

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface PageHeaderProps {
  title: string
  subtitle: string
  onRefresh?: () => void
}

export default function PageHeader({ title, subtitle, onRefresh }: PageHeaderProps) {
  const isMobile = useIsMobile()
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking')

  useEffect(() => {
    fetch('/api/colaboradores')
      .then((r) => { setDbStatus(r.ok ? 'connected' : 'error') })
      .catch(() => setDbStatus('error'))
  }, [])

  return (
    <div style={{
      display: 'flex',
      alignItems: isMobile ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '16px' : '24px 32px 20px',
      borderBottom: '1px solid #1e1e2e',
      flexWrap: 'wrap',
      gap: '8px',
    }}>
      <div>
        <h2 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '700', color: '#e2e8f0' }}>
          {title}
        </h2>
        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{subtitle}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block',
            backgroundColor: dbStatus === 'connected' ? '#10b981' : dbStatus === 'error' ? '#ef4444' : '#f59e0b',
          }} />
          <span style={{ color: '#6b7280' }}>
            {dbStatus === 'connected' ? 'Conectado' : dbStatus === 'error' ? 'Sin conexión' : '...'}
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              background: '#1a1a24', border: '1px solid #2a2a3a',
              color: '#9ca3af', padding: '5px 7px', borderRadius: '6px',
              display: 'flex', alignItems: 'center',
            }}
          >
            <RefreshCw size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
