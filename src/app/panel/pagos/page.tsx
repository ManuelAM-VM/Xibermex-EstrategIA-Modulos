'use client'

import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/PageHeader'
import { CheckCircle, Clock } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Modulo {
  id: string; nombre: string; horasEstimadas: number
  montoTotal: number | null; montoPagado: number; pagado: boolean; estado: string
  colaborador: { id: string; nombre: string }; proyecto: { nombre: string }
}
interface Colaborador { id: string; nombre: string }

export default function PagosPage() {
  const [modulos, setModulos]           = useState<Modulo[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading]           = useState(true)
  const [filtroCol, setFiltroCol]       = useState('')
  const [toggling, setToggling]         = useState<string | null>(null)
  const isMobile = useIsMobile()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [mRes, cRes] = await Promise.all([
        fetch('/api/modulos').then(r => r.json()),
        fetch('/api/colaboradores').then(r => r.json()),
      ])
      setModulos(Array.isArray(mRes) ? mRes : [])
      setColaboradores(cRes)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleToggle = async (modulo: Modulo) => {
    setToggling(modulo.id)
    try {
      const nuevoPagado = !modulo.pagado
      const res = await fetch(`/api/modulos/${modulo.id}`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagado: nuevoPagado, montoPagado: nuevoPagado ? (modulo.montoTotal ?? 0) : 0 }) })
      if (res.ok) {
        const updated = await res.json()
        setModulos(prev => prev.map(m => m.id === modulo.id ? { ...m, ...updated } : m))
      }
    } finally { setToggling(null) }
  }

  const filtrados     = modulos.filter(m => !filtroCol || m.colaborador.id === filtroCol)
  const porPagar      = filtrados.filter(m => ['APROBADO','ENTREGADO'].includes(m.estado) && !m.pagado)
  const pagados       = filtrados.filter(m => m.pagado)
  const totalPorPagar = porPagar.reduce((a, m) => a + ((m.montoTotal ?? 0) - m.montoPagado), 0)
  const totalPagado   = pagados.reduce((a, m) => a + m.montoPagado, 0)
  const pad = isMobile ? '16px' : '24px 32px'

  return (
    <div>
      <PageHeader title="Pagos" subtitle="Control de lo que debes y has pagado" onRefresh={fetchData} />
      <div style={{ padding: pad }}>
        {/* Filtro + totales */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filtroCol} onChange={e => setFiltroCol(e.target.value)} style={{ flex: isMobile ? 1 : 'none' }}>
            <option value="">Todos los colaboradores</option>
            {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <div style={{ marginLeft: isMobile ? 0 : 'auto', display: 'flex', gap: '14px', fontSize: '13px', flexWrap: 'wrap' }}>
            <span style={{ color: '#f59e0b' }}>Por pagar: <strong>${totalPorPagar.toFixed(0)}</strong></span>
            <span style={{ color: '#10b981' }}>Pagado: <strong>${totalPagado.toFixed(0)}</strong></span>
          </div>
        </div>

        {loading ? (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ backgroundColor: '#3b82f610', border: '1px solid #3b82f630', borderRadius: '8px', padding: '14px 18px', color: '#60a5fa', fontSize: '14px' }}>Sin módulos</div>
        ) : (
          <>
            {porPagar.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} /> Por pagar ({porPagar.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {porPagar.map(m => <PagoCard key={m.id} modulo={m} onToggle={handleToggle} toggling={toggling === m.id} isMobile={isMobile} />)}
                </div>
              </div>
            )}
            {pagados.length > 0 && (
              <div>
                <h3 style={{ fontSize: '12px', color: '#10b981', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={13} /> Pagados ({pagados.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pagados.map(m => <PagoCard key={m.id} modulo={m} onToggle={handleToggle} toggling={toggling === m.id} isMobile={isMobile} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PagoCard({ modulo, onToggle, toggling, isMobile }: {
  modulo: Modulo; onToggle: (m: Modulo) => void; toggling: boolean; isMobile: boolean
}) {
  return (
    <div style={{
      backgroundColor: '#1a1a24',
      border: `1px solid ${modulo.pagado ? '#10b98120' : '#2a2a3a'}`,
      borderRadius: '8px', padding: isMobile ? '12px' : '14px 16px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {modulo.nombre}
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          {modulo.colaborador.nombre.split(' ')[0]} · {modulo.proyecto.nombre}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: modulo.pagado ? '#10b981' : '#f59e0b' }}>
          ${(modulo.montoTotal ?? 0).toFixed(0)}
        </span>
        {/* Toggle */}
        <div onClick={toggling ? undefined : () => onToggle(modulo)}
          style={{ width: '36px', height: '20px', borderRadius: '10px', backgroundColor: modulo.pagado ? '#10b981' : '#2a2a3a',
            position: 'relative', cursor: toggling ? 'wait' : 'pointer', transition: 'background-color 0.2s', flexShrink: 0 }}>
          <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'white',
            position: 'absolute', top: '3px', left: modulo.pagado ? '19px' : '3px',
            transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
        </div>
      </div>
    </div>
  )
}
