'use client'

import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/PageHeader'
import { CheckCircle, XCircle, Clock, PlayCircle } from 'lucide-react'
import { COMPLEJIDAD_LABELS, TIPO_TAREA_LABELS, ESTADO_LABELS } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Modulo {
  id: string; nombre: string; descripcion: string | null
  tipoTarea: string; complejidad: string; horasEstimadas: number
  montoTotal: number | null; alertaHoras: boolean; createdAt: string
  estado: string
  colaborador: { nombre: string }; proyecto: { nombre: string }
}

// Estados que pueden ser revisados/aprobados
const ESTADOS_REVISABLES = ['PENDIENTE', 'EN_CURSO', 'ENTREGADO']

const ESTADO_COLORS: Record<string, { bg: string; text: string }> = {
  PENDIENTE: { bg: '#f59e0b15', text: '#f59e0b' },
  EN_CURSO:  { bg: '#3b82f615', text: '#60a5fa' },
  ENTREGADO: { bg: '#10b98115', text: '#34d399' },
}

export default function AprobarPage() {
  const [modulos, setModulos]       = useState<Modulo[]>([])
  const [loading, setLoading]       = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const isMobile = useIsMobile()

  const fetchPendientes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Traer todos los módulos que están en proceso (no terminados ni rechazados)
      const [p, c, e] = await Promise.all([
        fetch('/api/modulos?estado=PENDIENTE').then(r => r.json()),
        fetch('/api/modulos?estado=EN_CURSO').then(r => r.json()),
        fetch('/api/modulos?estado=ENTREGADO').then(r => r.json()),
      ])
      const todos = [...(Array.isArray(e) ? e : []), ...(Array.isArray(c) ? c : []), ...(Array.isArray(p) ? p : [])]
      setModulos(todos)
    } catch {
      setError('Error al cargar módulos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPendientes() }, [fetchPendientes])

  // Aprobar: PENDIENTE/EN_CURSO/ENTREGADO → APROBADO
  const handleAprobar = async (id: string) => {
    setProcesando(id)
    setError(null)
    try {
      const res = await fetch(`/api/modulos/${id}/aprobar`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al aprobar')
        return
      }
      setModulos(prev => prev.filter(m => m.id !== id))
    } finally {
      setProcesando(null)
    }
  }

  // Marcar EN CURSO: PENDIENTE → EN_CURSO
  const handleIniciar = async (id: string) => {
    setProcesando(id)
    setError(null)
    try {
      const res = await fetch(`/api/modulos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'EN_CURSO' }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al iniciar')
        return
      }
      const updated = await res.json()
      setModulos(prev => prev.map(m => m.id === id ? { ...m, estado: updated.estado } : m))
    } finally {
      setProcesando(null)
    }
  }

  // Marcar ENTREGADO: EN_CURSO → ENTREGADO
  const handleEntregar = async (id: string) => {
    setProcesando(id)
    setError(null)
    try {
      const res = await fetch(`/api/modulos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'ENTREGADO' }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al marcar entregado')
        return
      }
      const updated = await res.json()
      setModulos(prev => prev.map(m => m.id === id ? { ...m, estado: updated.estado } : m))
    } finally {
      setProcesando(null)
    }
  }

  // Rechazar: cualquier estado → RECHAZADO
  const handleRechazar = async (id: string) => {
    if (!confirm('¿Rechazar este módulo?')) return
    setProcesando(id)
    setError(null)
    try {
      const res = await fetch(`/api/modulos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'RECHAZADO' }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al rechazar')
        return
      }
      setModulos(prev => prev.filter(m => m.id !== id))
    } finally {
      setProcesando(null)
    }
  }

  const pad = isMobile ? '16px' : '24px 32px'

  // Agrupar por estado para mostrar en orden lógico
  const entregados = modulos.filter(m => m.estado === 'ENTREGADO')
  const enCurso    = modulos.filter(m => m.estado === 'EN_CURSO')
  const pendientes = modulos.filter(m => m.estado === 'PENDIENTE')

  return (
    <div>
      <PageHeader title="Gestión de módulos" subtitle="Avanza el estado de cada módulo en el flujo de trabajo" onRefresh={fetchPendientes} />
      <div style={{ padding: pad }}>

        {/* Flujo visual */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '12px', color: '#6b7280' }}>
            {['Pendiente', 'En curso', 'Entregado', 'Aprobado'].map((s, i, arr) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ padding: '3px 10px', borderRadius: '4px', backgroundColor: '#1a1a24', border: '1px solid #2a2a3a' }}>{s}</span>
                {i < arr.length - 1 && <span style={{ color: '#374151' }}>→</span>}
              </span>
            ))}
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#ef444415', border: '1px solid #ef444440', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#f87171' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>Cargando...</div>
        ) : modulos.length === 0 ? (
          <div style={{ backgroundColor: '#10b98115', border: '1px solid #10b98130', borderRadius: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={15} color="#10b981" />
            <span style={{ color: '#10b981', fontSize: '14px' }}>No hay módulos activos en el flujo.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* ENTREGADOS — listos para aprobar */}
            {entregados.length > 0 && (
              <Seccion titulo="Listos para aprobar" count={entregados.length} color="#10b981">
                {entregados.map(m => (
                  <ModuloCard key={m.id} m={m} procesando={procesando === m.id} isMobile={isMobile}
                    acciones={[
                      { label: isMobile ? '' : 'Aprobar', icon: <CheckCircle size={13} />, color: '#10b981', bg: '#10b98120', border: '#10b98140', onClick: () => handleAprobar(m.id) },
                      { label: isMobile ? '' : 'Rechazar', icon: <XCircle size={13} />, color: '#f87171', bg: '#ef444415', border: '#ef444440', onClick: () => handleRechazar(m.id) },
                    ]}
                  />
                ))}
              </Seccion>
            )}

            {/* EN CURSO */}
            {enCurso.length > 0 && (
              <Seccion titulo="En desarrollo" count={enCurso.length} color="#60a5fa">
                {enCurso.map(m => (
                  <ModuloCard key={m.id} m={m} procesando={procesando === m.id} isMobile={isMobile}
                    acciones={[
                      { label: isMobile ? '' : 'Marcar entregado', icon: <CheckCircle size={13} />, color: '#34d399', bg: '#10b98115', border: '#10b98130', onClick: () => handleEntregar(m.id) },
                      { label: isMobile ? '' : 'Rechazar', icon: <XCircle size={13} />, color: '#f87171', bg: '#ef444415', border: '#ef444440', onClick: () => handleRechazar(m.id) },
                    ]}
                  />
                ))}
              </Seccion>
            )}

            {/* PENDIENTES */}
            {pendientes.length > 0 && (
              <Seccion titulo="Pendientes de revisión" count={pendientes.length} color="#f59e0b">
                {pendientes.map(m => (
                  <ModuloCard key={m.id} m={m} procesando={procesando === m.id} isMobile={isMobile}
                    acciones={[
                      { label: isMobile ? '' : 'Iniciar', icon: <PlayCircle size={13} />, color: '#60a5fa', bg: '#3b82f615', border: '#3b82f630', onClick: () => handleIniciar(m.id) },
                      { label: isMobile ? '' : 'Aprobar directo', icon: <CheckCircle size={13} />, color: '#10b981', bg: '#10b98115', border: '#10b98130', onClick: () => handleAprobar(m.id) },
                      { label: isMobile ? '' : 'Rechazar', icon: <XCircle size={13} />, color: '#f87171', bg: '#ef444415', border: '#ef444440', onClick: () => handleRechazar(m.id) },
                    ]}
                  />
                ))}
              </Seccion>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sección con título ────────────────────────────────────────────────────────
function Seccion({ titulo, count, color, children }: {
  titulo: string; count: number; color: string; children: React.ReactNode
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
        <span style={{ fontSize: '12px', fontWeight: '600', color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {titulo}
        </span>
        <span style={{ fontSize: '11px', color: '#4b5563' }}>({count})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {children}
      </div>
    </div>
  )
}

// ── Card de módulo ────────────────────────────────────────────────────────────
interface Accion {
  label: string; icon: React.ReactNode
  color: string; bg: string; border: string
  onClick: () => void
}

function ModuloCard({ m, procesando, isMobile, acciones }: {
  m: Modulo; procesando: boolean; isMobile: boolean; acciones: Accion[]
}) {
  const estadoColor = ESTADO_COLORS[m.estado] || { bg: '#2a2a3a', text: '#9ca3af' }

  return (
    <div style={{
      backgroundColor: '#1a1a24',
      border: `1px solid ${m.alertaHoras ? '#f59e0b40' : '#2a2a3a'}`,
      borderRadius: '10px', padding: isMobile ? '12px' : '16px 18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>{m.nombre}</h3>
            <span style={{ fontSize: '10px', backgroundColor: estadoColor.bg, color: estadoColor.text, padding: '2px 7px', borderRadius: '4px' }}>
              {ESTADO_LABELS[m.estado] ?? m.estado}
            </span>
            {m.alertaHoras && (
              <span style={{ backgroundColor: '#f59e0b20', color: '#f59e0b', fontSize: '10px', padding: '2px 7px', borderRadius: '4px' }}>
                ⚠️ Alerta horas
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#9ca3af', flexWrap: 'wrap', marginBottom: m.descripcion ? '6px' : '0' }}>
            <span>👤 {m.colaborador.nombre.split(' ')[0]}</span>
            <span>📁 {m.proyecto.nombre}</span>
            <span>🏷️ {TIPO_TAREA_LABELS[m.tipoTarea] ?? m.tipoTarea}</span>
            <span>⚡ {COMPLEJIDAD_LABELS[m.complejidad] ?? m.complejidad}</span>
            <span><Clock size={11} style={{ display: 'inline', marginRight: '3px', verticalAlign: 'middle' }} />{m.horasEstimadas}h</span>
            {m.montoTotal != null && <span style={{ color: '#10b981' }}>${m.montoTotal.toFixed(0)}</span>}
          </div>
          {m.descripcion && (
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {m.descripcion}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, flexWrap: 'wrap' }}>
          {acciones.map((a, i) => (
            <button key={i} onClick={a.onClick} disabled={procesando}
              style={{ backgroundColor: a.bg, border: `1px solid ${a.border}`, color: a.color, display: 'flex', alignItems: 'center', gap: '5px', padding: isMobile ? '7px 10px' : '7px 14px', fontSize: '13px' }}>
              {a.icon} {procesando ? '...' : a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
