'use client'

import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/PageHeader'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { COMPLEJIDAD_LABELS, TIPO_TAREA_LABELS } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Modulo {
  id: string; nombre: string; descripcion: string | null
  tipoTarea: string; complejidad: string; horasEstimadas: number
  montoTotal: number | null; alertaHoras: boolean; createdAt: string
  colaborador: { nombre: string }; proyecto: { nombre: string }
}

export default function AprobarPage() {
  const [modulos, setModulos]     = useState<Modulo[]>([])
  const [loading, setLoading]     = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)
  const isMobile = useIsMobile()

  const fetchPendientes = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/modulos?estado=PENDIENTE')
      const data = await res.json()
      setModulos(data)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPendientes() }, [fetchPendientes])

  const handleAprobar = async (id: string) => {
    setProcesando(id)
    try {
      await fetch(`/api/modulos/${id}/aprobar`, { method: 'POST' })
      setModulos(prev => prev.filter(m => m.id !== id))
    } finally { setProcesando(null) }
  }

  const handleRechazar = async (id: string) => {
    setProcesando(id)
    try {
      await fetch(`/api/modulos/${id}`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'RECHAZADO' }) })
      setModulos(prev => prev.filter(m => m.id !== id))
    } finally { setProcesando(null) }
  }

  const pad = isMobile ? '16px' : '24px 32px'

  return (
    <div>
      <PageHeader title="Aprobar módulos" subtitle="Módulos pendientes de tu visto bueno" onRefresh={fetchPendientes} />
      <div style={{ padding: pad }}>
        {loading ? (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>Cargando...</div>
        ) : modulos.length === 0 ? (
          <div style={{ backgroundColor: '#10b98115', border: '1px solid #10b98130', borderRadius: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={15} color="#10b981" />
            <span style={{ color: '#10b981', fontSize: '14px' }}>No hay módulos pendientes.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {modulos.map(m => (
              <div key={m.id} style={{
                backgroundColor: '#1a1a24',
                border: `1px solid ${m.alertaHoras ? '#f59e0b40' : '#2a2a3a'}`,
                borderRadius: '10px', padding: isMobile ? '14px' : '18px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>{m.nombre}</h3>
                      {m.alertaHoras && (
                        <span style={{ backgroundColor: '#f59e0b20', color: '#f59e0b', fontSize: '11px', padding: '2px 7px', borderRadius: '4px' }}>
                          ⚠️ Alerta horas
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#9ca3af', flexWrap: 'wrap', marginBottom: m.descripcion ? '6px' : '0' }}>
                      <span>👤 {m.colaborador.nombre.split(' ')[0]}</span>
                      <span>📁 {m.proyecto.nombre}</span>
                      <span>🏷️ {TIPO_TAREA_LABELS[m.tipoTarea]}</span>
                      <span>⚡ {COMPLEJIDAD_LABELS[m.complejidad]}</span>
                      <span><Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />{m.horasEstimadas}h</span>
                      {m.montoTotal && <span style={{ color: '#10b981' }}>${m.montoTotal.toFixed(0)}</span>}
                    </div>
                    {m.descripcion && <p style={{ fontSize: '12px', color: '#6b7280' }}>{m.descripcion}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => handleRechazar(m.id)} disabled={procesando === m.id}
                      style={{ backgroundColor: '#ef444415', border: '1px solid #ef444440', color: '#f87171', display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', fontSize: '13px' }}>
                      <XCircle size={13} /> {isMobile ? '' : 'Rechazar'}
                    </button>
                    <button onClick={() => handleAprobar(m.id)} disabled={procesando === m.id}
                      style={{ backgroundColor: '#10b98120', border: '1px solid #10b98140', color: '#34d399', display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', fontSize: '13px' }}>
                      <CheckCircle size={13} /> {procesando === m.id ? '...' : isMobile ? '' : 'Aprobar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
