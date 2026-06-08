'use client'

import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/PageHeader'
import { CheckCircle, Clock, ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getQuincena, getQuincenaActual, getQuincenasDesdeModulos } from '@/lib/utils'
import type { Quincena } from '@/lib/utils'

interface Modulo {
  id: string; nombre: string; horasEstimadas: number
  montoTotal: number | null; montoPagado: number; pagado: boolean
  estado: string; createdAt: string
  colaborador: { id: string; nombre: string }; proyecto: { nombre: string }
}
interface Colaborador { id: string; nombre: string }

export default function PagosPage() {
  const [modulos, setModulos]             = useState<Modulo[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading]             = useState(true)
  const [filtroCol, setFiltroCol]         = useState('')
  const [toggling, setToggling]           = useState<string | null>(null)
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
      const res = await fetch(`/api/modulos/${modulo.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagado: nuevoPagado, montoPagado: nuevoPagado ? (modulo.montoTotal ?? 0) : 0 }),
      })
      if (res.ok) {
        const updated = await res.json()
        setModulos(prev => prev.map(m => m.id === modulo.id ? { ...m, ...updated } : m))
      }
    } finally { setToggling(null) }
  }

  const filtrados = modulos.filter(m => !filtroCol || m.colaborador.id === filtroCol)
  const quincenas = getQuincenasDesdeModulos(filtrados.map(m => m.createdAt))
  const quincenaActual = getQuincenaActual()

  const totalPorPagar = filtrados.filter(m => !m.pagado && (m.montoTotal ?? 0) > 0)
    .reduce((a, m) => a + ((m.montoTotal ?? 0) - m.montoPagado), 0)
  const totalPagado = filtrados.filter(m => m.pagado).reduce((a, m) => a + m.montoPagado, 0)

  const pad = isMobile ? '14px' : '24px 32px'

  return (
    <div>
      <PageHeader title="Pagos" subtitle="Control por quincena" onRefresh={fetchData} />
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
        ) : quincenas.length === 0 ? (
          <div style={{ backgroundColor: '#3b82f610', border: '1px solid #3b82f630', borderRadius: '8px', padding: '14px 18px', color: '#60a5fa', fontSize: '14px' }}>Sin módulos</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {quincenas.map(q => {
              const mods = filtrados.filter(m => getQuincena(m.createdAt).id === q.id)
              const esCurrent = q.id === quincenaActual.id
              return (
                <QuincenaAccordion
                  key={q.id}
                  quincena={q}
                  modulos={mods}
                  onToggle={handleToggle}
                  toggling={toggling}
                  isMobile={isMobile}
                  defaultOpen={esCurrent}
                  esCurrent={esCurrent}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Acordeón por quincena ────────────────────────────────────────────────────
function QuincenaAccordion({ quincena, modulos, onToggle, toggling, isMobile, defaultOpen, esCurrent }: {
  quincena: Quincena; modulos: Modulo[]
  onToggle: (m: Modulo) => void; toggling: string | null
  isMobile: boolean; defaultOpen: boolean; esCurrent: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const porPagar = modulos.filter(m => !m.pagado && (m.montoTotal ?? 0) > 0)
  const pagados  = modulos.filter(m => m.pagado)
  const sumaPorPagar = porPagar.reduce((a, m) => a + ((m.montoTotal ?? 0) - m.montoPagado), 0)
  const sumaPagado   = pagados.reduce((a, m) => a + m.montoPagado, 0)

  return (
    <div style={{
      border: `1px solid ${esCurrent ? '#7c3aed30' : '#1e1e2e'}`,
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: esCurrent ? '#1a1a2408' : '#16161f',
    }}>
      {/* Header clickeable */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: isMobile ? '12px 14px' : '14px 18px',
          cursor: 'pointer',
          backgroundColor: esCurrent ? '#7c3aed08' : 'transparent',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={14} color={esCurrent ? '#7c3aed' : '#4b5563'} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: esCurrent ? '#a78bfa' : '#9ca3af' }}>
            {quincena.label}
          </span>
          {esCurrent && (
            <span style={{ fontSize: '9px', backgroundColor: '#7c3aed30', color: '#a78bfa', padding: '2px 6px', borderRadius: '10px', fontWeight: '600' }}>
              ACTUAL
            </span>
          )}
          <span style={{ fontSize: '11px', color: '#4b5563' }}>
            ({modulos.length})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {sumaPorPagar > 0 && <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>${sumaPorPagar.toFixed(0)}</span>}
          {sumaPagado > 0 && <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>${sumaPagado.toFixed(0)}</span>}
          <span style={{ color: '#4b5563' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </div>
      </div>

      {/* Contenido */}
      {open && (
        <div style={{ padding: isMobile ? '0 12px 12px' : '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {porPagar.length > 0 && (
            <>
              <p style={{ fontSize: '10px', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px', marginBottom: '4px', fontWeight: '600' }}>
                <Clock size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Por pagar ({porPagar.length})
              </p>
              {porPagar.map(m => <PagoCard key={m.id} modulo={m} onToggle={onToggle} toggling={toggling === m.id} isMobile={isMobile} />)}
            </>
          )}
          {pagados.length > 0 && (
            <>
              <p style={{ fontSize: '10px', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '8px', marginBottom: '4px', fontWeight: '600' }}>
                <CheckCircle size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Pagados ({pagados.length})
              </p>
              {pagados.map(m => <PagoCard key={m.id} modulo={m} onToggle={onToggle} toggling={toggling === m.id} isMobile={isMobile} />)}
            </>
          )}
          {modulos.length === 0 && (
            <p style={{ fontSize: '12px', color: '#4b5563', textAlign: 'center', padding: '12px' }}>Sin módulos</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Card de pago ─────────────────────────────────────────────────────────────
function PagoCard({ modulo, onToggle, toggling, isMobile }: {
  modulo: Modulo; onToggle: (m: Modulo) => void; toggling: boolean; isMobile: boolean
}) {
  return (
    <div style={{
      backgroundColor: modulo.pagado ? '#10b98108' : '#1a1a24',
      border: `1px solid ${modulo.pagado ? '#10b98118' : '#2a2a3a'}`,
      borderRadius: '8px', padding: isMobile ? '10px 12px' : '11px 14px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {modulo.nombre}
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          {modulo.colaborador.nombre.split(' ')[0]} · {modulo.proyecto.nombre} · {modulo.horasEstimadas}h
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <span style={{ fontSize: '15px', fontWeight: '700', color: modulo.pagado ? '#10b981' : '#f59e0b' }}>
          ${(modulo.montoTotal ?? 0).toFixed(0)}
        </span>
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
