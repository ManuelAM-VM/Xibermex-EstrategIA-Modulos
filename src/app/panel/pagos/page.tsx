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
  const [mostrarAnteriores, setMostrarAnteriores] = useState(false)
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

  // Filtrar por colaborador
  const filtrados = modulos.filter(m => !filtroCol || m.colaborador.id === filtroCol)

  // Quincena actual
  const quincenaActual = getQuincenaActual()

  // Separar módulos por quincena
  const modulosConQuincena = filtrados.map(m => ({
    ...m,
    quincena: getQuincena(m.createdAt),
  }))

  // Módulos de la quincena actual (todos se muestran)
  const modulosActuales = modulosConQuincena.filter(m => m.quincena.id === quincenaActual.id)

  // Módulos de quincenas anteriores
  const modulosAnteriores = modulosConQuincena.filter(m => m.quincena.id !== quincenaActual.id)

  // En anteriores: ocultar pagados/entregados a menos que se pida mostrar
  const anterioresVisibles = mostrarAnteriores
    ? modulosAnteriores
    : modulosAnteriores.filter(m => !m.pagado && (m.montoTotal ?? 0) > 0)

  // Agrupar anteriores por quincena
  const quincenasAnteriores = getQuincenasDesdeModulos(anterioresVisibles.map(m => m.createdAt))

  // Totales
  const porPagarActual = modulosActuales.filter(m => !m.pagado && (m.montoTotal ?? 0) > 0)
    .reduce((a, m) => a + ((m.montoTotal ?? 0) - m.montoPagado), 0)
  const pagadoActual = modulosActuales.filter(m => m.pagado)
    .reduce((a, m) => a + m.montoPagado, 0)
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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ── Quincena actual ── */}
            <QuincenaSection
              quincena={quincenaActual}
              modulos={modulosActuales}
              onToggle={handleToggle}
              toggling={toggling}
              isMobile={isMobile}
              esCurrent
              resumen={{ porPagar: porPagarActual, pagado: pagadoActual }}
            />

            {/* ── Quincenas anteriores ── */}
            {modulosAnteriores.length > 0 && (
              <div>
                <button
                  onClick={() => setMostrarAnteriores(!mostrarAnteriores)}
                  style={{
                    background: 'none', border: '1px solid #2a2a3a', color: '#6b7280',
                    padding: '8px 14px', borderRadius: '8px', fontSize: '12px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    marginBottom: '12px', cursor: 'pointer',
                  }}
                >
                  <Calendar size={13} />
                  {mostrarAnteriores ? 'Ocultar pagados de quincenas anteriores' : `Mostrar todos (${modulosAnteriores.length} módulos anteriores)`}
                  {mostrarAnteriores ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {anterioresVisibles.length > 0 && quincenasAnteriores.map(q => {
                  const mods = anterioresVisibles.filter(m => m.quincena.id === q.id)
                  if (mods.length === 0) return null
                  return (
                    <QuincenaSection
                      key={q.id}
                      quincena={q}
                      modulos={mods}
                      onToggle={handleToggle}
                      toggling={toggling}
                      isMobile={isMobile}
                    />
                  )
                })}

                {anterioresVisibles.length === 0 && !mostrarAnteriores && (
                  <div style={{ fontSize: '12px', color: '#4b5563', padding: '8px 0' }}>
                    Todos los módulos de quincenas anteriores están pagados.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sección por quincena ─────────────────────────────────────────────────────
function QuincenaSection({ quincena, modulos, onToggle, toggling, isMobile, esCurrent, resumen }: {
  quincena: Quincena
  modulos: Modulo[]
  onToggle: (m: Modulo) => void
  toggling: string | null
  isMobile: boolean
  esCurrent?: boolean
  resumen?: { porPagar: number; pagado: number }
}) {
  const porPagar = modulos.filter(m => !m.pagado && (m.montoTotal ?? 0) > 0)
  const pagados  = modulos.filter(m => m.pagado)

  return (
    <div style={{
      backgroundColor: esCurrent ? '#1a1a2410' : 'transparent',
      border: esCurrent ? '1px solid #7c3aed30' : '1px solid #1e1e2e',
      borderRadius: '12px',
      padding: isMobile ? '14px' : '18px',
    }}>
      {/* Header de quincena */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={14} color={esCurrent ? '#7c3aed' : '#6b7280'} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: esCurrent ? '#a78bfa' : '#9ca3af' }}>
            {quincena.label}
          </span>
          {esCurrent && (
            <span style={{ fontSize: '10px', backgroundColor: '#7c3aed30', color: '#a78bfa', padding: '2px 7px', borderRadius: '10px' }}>
              Actual
            </span>
          )}
        </div>
        {resumen && (
          <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
            <span style={{ color: '#f59e0b' }}>${resumen.porPagar.toFixed(0)}</span>
            <span style={{ color: '#10b981' }}>${resumen.pagado.toFixed(0)}</span>
          </div>
        )}
      </div>

      {modulos.length === 0 ? (
        <div style={{ fontSize: '12px', color: '#4b5563', textAlign: 'center', padding: '12px' }}>
          Sin módulos en esta quincena
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Por pagar primero */}
          {porPagar.map(m => (
            <PagoCard key={m.id} modulo={m} onToggle={onToggle} toggling={toggling === m.id} isMobile={isMobile} />
          ))}
          {/* Pagados después */}
          {pagados.map(m => (
            <PagoCard key={m.id} modulo={m} onToggle={onToggle} toggling={toggling === m.id} isMobile={isMobile} />
          ))}
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
      border: `1px solid ${modulo.pagado ? '#10b98120' : '#2a2a3a'}`,
      borderRadius: '8px', padding: isMobile ? '10px 12px' : '12px 16px',
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
