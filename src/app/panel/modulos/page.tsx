'use client'

import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/PageHeader'
import {
  Search, Trash2, CheckCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Save
} from 'lucide-react'
import {
  COMPLEJIDAD_LABELS, ESTADO_LABELS, TIPO_TAREA_LABELS,
  TIPOS_TAREA, COMPLEJIDADES
} from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Pago {
  id: string
  monto: number
  fecha: string
  notas: string | null
}

interface Modulo {
  id: string
  nombre: string
  descripcion: string | null
  tipoTarea: string
  complejidad: string
  horasEstimadas: number
  horasReales: number | null
  montoTotal: number | null
  montoPagado: number
  pagado: boolean
  estado: string
  alertaHoras: boolean
  notasIA: string | null
  createdAt: string
  fechaEntrega: string | null
  tarifaHora: number
  modoPago: string
  montoFijo: number | null
  colaborador: { id: string; nombre: string }
  proyecto: { id: string; nombre: string }
  pagos: Pago[]
}

interface Colaborador { id: string; nombre: string }
interface Proyecto    { id: string; nombre: string }

const ESTADO_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PENDIENTE:  { bg: '#f59e0b15', text: '#f59e0b', border: '#f59e0b40' },
  EN_CURSO:   { bg: '#3b82f615', text: '#60a5fa', border: '#3b82f640' },
  ENTREGADO:  { bg: '#10b98115', text: '#34d399', border: '#10b98140' },
  APROBADO:   { bg: '#10b98120', text: '#10b981', border: '#10b98150' },
  RECHAZADO:  { bg: '#ef444415', text: '#f87171', border: '#ef444440' },
}

// ─── Fila expandible ────────────────────────────────────────────────────────
function ModuloRow({
  modulo,
  onUpdate,
  onDelete,
  isMobile,
}: {
  modulo: Modulo
  onUpdate: (id: string, data: Partial<Modulo>) => void
  onDelete: (id: string) => void
  isMobile: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [toggling, setToggling] = useState(false)

  // Campos editables
  const [estado, setEstado]                 = useState(modulo.estado)
  const [horasEstimadas, setHorasEstimadas] = useState(String(modulo.horasEstimadas))
  const [horasReales, setHorasReales]       = useState(String(modulo.horasReales ?? ''))
  const [descripcion, setDescripcion]       = useState(modulo.descripcion ?? '')
  const [tipoTarea, setTipoTarea]           = useState(modulo.tipoTarea)
  const [complejidad, setComplejidad]       = useState(modulo.complejidad)

  // Modo de pago
  const [modoPago, setModoPago]   = useState(modulo.modoPago ?? 'POR_HORA')
  const [tarifa, setTarifa]       = useState(String(modulo.tarifaHora ?? 500))
  const [montoFijo, setMontoFijo] = useState(String(modulo.montoFijo ?? ''))
  // Base de horas para el cálculo: ESTIMADAS o REALES
  const [baseHoras, setBaseHoras] = useState<'ESTIMADAS' | 'REALES'>('ESTIMADAS')

  // Horas activas según la base seleccionada
  const horasActivas = (() => {
    if (baseHoras === 'REALES' && horasReales) return parseFloat(horasReales) || 0
    return parseFloat(horasEstimadas) || 0
  })()

  // Preview del monto calculado
  const montoPreview = (() => {
    const t = parseFloat(tarifa) || 0
    if (modoPago === 'POR_HORA')   return t * horasActivas
    if (modoPago === 'POR_DIA')    return t * (Math.ceil(horasActivas / 8) || 1)
    if (modoPago === 'MONTO_FIJO') return parseFloat(montoFijo) || 0
    return 0
  })()

  const estadoColor = ESTADO_COLORS[estado] || { bg: '#2a2a3a', text: '#9ca3af', border: '#2a2a3a' }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/modulos/${modulo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado,
          horasEstimadas: parseFloat(horasEstimadas) || modulo.horasEstimadas,
          horasReales: horasReales ? parseFloat(horasReales) : null,
          descripcion: descripcion || null,
          tipoTarea,
          complejidad,
          modoPago,
          tarifaHora: parseFloat(tarifa) || 500,
          montoFijo: modoPago === 'MONTO_FIJO' ? (parseFloat(montoFijo) || null) : null,
          // Pasar las horas activas para que la API calcule el montoTotal correcto
          _horasParaPago: horasActivas,
          ...(estado === 'APROBADO' && !modulo.fechaEntrega
            ? { fechaEntrega: new Date().toISOString() }
            : {}),
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate(modulo.id, updated)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePago = async () => {
    setToggling(true)
    try {
      const nuevoPagado = !modulo.pagado
      const res = await fetch(`/api/modulos/${modulo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pagado: nuevoPagado,
          montoPagado: nuevoPagado ? (modulo.montoTotal ?? 0) : 0,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate(modulo.id, updated)
      }
    } finally {
      setToggling(false)
    }
  }

  const dirty =
    estado !== modulo.estado ||
    horasEstimadas !== String(modulo.horasEstimadas) ||
    horasReales !== String(modulo.horasReales ?? '') ||
    descripcion !== (modulo.descripcion ?? '') ||
    tipoTarea !== modulo.tipoTarea ||
    complejidad !== modulo.complejidad ||
    modoPago !== (modulo.modoPago ?? 'POR_HORA') ||
    tarifa !== String(modulo.tarifaHora ?? 500) ||
    montoFijo !== String(modulo.montoFijo ?? '')

  return (
    <div
      style={{
        backgroundColor: '#1a1a24',
        border: `1px solid ${expanded ? estadoColor.border : (modulo.alertaHoras ? '#f59e0b30' : '#2a2a3a')}`,
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* ── Fila principal (siempre visible) ── */}
      <div
        style={{ padding: isMobile ? '12px' : '11px 14px', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        {isMobile ? (
          /* Móvil: layout en columna */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>{modulo.nombre}</span>
                  {modulo.alertaHoras && <AlertTriangle size={12} color="#f59e0b" />}
                  {modulo.pagado && <CheckCircle size={12} color="#10b981" />}
                </div>
                <span style={{ fontSize: '11px', color: '#4b5563' }}>
                  {modulo.proyecto.nombre} · {modulo.colaborador.nombre.split(' ')[0]}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <button onClick={e => { e.stopPropagation(); onDelete(modulo.id) }}
                  style={{ background: 'none', border: 'none', color: '#374151', padding: '4px', display: 'flex' }}>
                  <Trash2 size={14} />
                </button>
                <span style={{ color: '#4b5563' }}>{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', backgroundColor: estadoColor.bg, color: estadoColor.text, padding: '3px 8px', borderRadius: '4px' }}>
                {ESTADO_LABELS[estado] ?? estado}
              </span>
              <span style={{ fontSize: '11px', color: '#6b7280', backgroundColor: '#1e1e2e', padding: '3px 8px', borderRadius: '4px' }}>
                {TIPO_TAREA_LABELS[modulo.tipoTarea] ?? modulo.tipoTarea}
              </span>
              <span style={{ fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Clock size={10} />
                {expanded ? horasEstimadas : modulo.horasEstimadas}h
                {(expanded ? horasReales : String(modulo.horasReales ?? '')) ? ` / ${expanded ? horasReales : modulo.horasReales}h real` : ''}
              </span>
              {(dirty ? montoPreview : modulo.montoTotal) != null && (
                <span style={{ fontSize: '13px', fontWeight: '700', color: modulo.pagado ? '#10b981' : '#f59e0b', marginLeft: 'auto' }}>
                  ${(dirty ? montoPreview : (modulo.montoTotal ?? 0)).toFixed(0)}
                </span>
              )}
            </div>
          </>
        ) : (
          /* Desktop: grid */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 100px 110px 90px 72px', gap: '10px', alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {modulo.nombre}
                </span>
                {modulo.alertaHoras && <AlertTriangle size={11} color="#f59e0b" style={{ flexShrink: 0 }} />}
                {modulo.pagado && <CheckCircle size={11} color="#10b981" style={{ flexShrink: 0 }} />}
              </div>
              <span style={{ fontSize: '11px', color: '#4b5563' }}>
                {modulo.proyecto.nombre} · {modulo.colaborador.nombre.split(' ')[0]}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>{TIPO_TAREA_LABELS[modulo.tipoTarea] ?? modulo.tipoTarea}</span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>{COMPLEJIDAD_LABELS[modulo.complejidad] ?? modulo.complejidad}</span>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Clock size={10} />{expanded ? horasEstimadas : modulo.horasEstimadas}h est.
              </div>
              {(expanded ? horasReales : String(modulo.horasReales ?? '')) && (
                <div style={{ color: '#6b7280', fontSize: '11px' }}>{expanded ? horasReales : modulo.horasReales}h real</div>
              )}
            </div>
            <span style={{ fontSize: '11px', backgroundColor: estadoColor.bg, color: estadoColor.text, padding: '3px 8px', borderRadius: '4px', display: 'inline-block', whiteSpace: 'nowrap' }}
              onClick={e => e.stopPropagation()}>
              {ESTADO_LABELS[estado] ?? estado}
            </span>
            <div style={{ fontSize: '12px' }}>
              {(dirty ? montoPreview : modulo.montoTotal) != null && (
                <div style={{ color: modulo.pagado ? '#10b981' : '#f59e0b', fontWeight: '600' }}>
                  ${(dirty ? montoPreview : (modulo.montoTotal ?? 0)).toFixed(0)}
                </div>
              )}
              {modulo.montoPagado > 0 && !modulo.pagado && (
                <div style={{ color: '#6b7280', fontSize: '11px' }}>${modulo.montoPagado.toFixed(0)} pag.</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
              <button onClick={e => { e.stopPropagation(); onDelete(modulo.id) }}
                style={{ background: 'none', border: 'none', color: '#374151', padding: '4px', display: 'flex' }} title="Eliminar">
                <Trash2 size={13} />
              </button>
              <div style={{ color: '#4b5563' }}>{expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Panel expandido ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid #2a2a3a', padding: isMobile ? '12px' : '16px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Campos de edición */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelSt}>Estado</label>
              <select value={estado} onChange={(e) => setEstado(e.target.value)} style={{ width: '100%', fontSize: '13px' }}>
                {Object.entries(ESTADO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelSt}>Horas estimadas</label>
              <input type="number" value={horasEstimadas} onChange={(e) => setHorasEstimadas(e.target.value)} min="0" step="0.5" style={{ fontSize: '13px' }} />
            </div>
            <div>
              <label style={labelSt}>Horas reales</label>
              <input type="number" value={horasReales} onChange={(e) => setHorasReales(e.target.value)} placeholder="Sin registrar" min="0" step="0.5" style={{ fontSize: '13px' }} />
            </div>
            <div>
              <label style={labelSt}>Tipo de tarea</label>
              <select value={tipoTarea} onChange={(e) => setTipoTarea(e.target.value)} style={{ width: '100%', fontSize: '13px' }}>
                {TIPOS_TAREA.map((t) => (
                  <option key={t} value={t}>{TIPO_TAREA_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelSt}>Complejidad</label>
              <select value={complejidad} onChange={(e) => setComplejidad(e.target.value)} style={{ width: '100%', fontSize: '13px' }}>
                {COMPLEJIDADES.map((c) => (
                  <option key={c} value={c}>{COMPLEJIDAD_LABELS[c]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label style={labelSt}>Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              style={{ fontSize: '13px', resize: 'vertical' }}
            />
          </div>

          {/* ── Modo de pago ── */}
          <div style={{ backgroundColor: '#13131a', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '14px' }}>
            <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Configuración de pago
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '12px', alignItems: 'stretch' }}>

              {/* Modo */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelSt}>Modo de pago</label>
                <select
                  value={modoPago}
                  onChange={(e) => {
                    setModoPago(e.target.value)
                    if (e.target.value === 'POR_HORA')   setTarifa('500')
                    if (e.target.value === 'POR_DIA')    setTarifa('4000')
                    if (e.target.value === 'MONTO_FIJO') setMontoFijo('')
                  }}
                  style={{ width: '100%', fontSize: '13px', flex: 1 }}
                >
                  <option value="POR_HORA">Por hora</option>
                  <option value="POR_DIA">Por día</option>
                  <option value="MONTO_FIJO">Monto fijo</option>
                </select>
              </div>

              {/* Base de horas */}
              {modoPago !== 'MONTO_FIJO' && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelSt}>Cobrar con base en</label>
                  <select
                    value={baseHoras}
                    onChange={(e) => setBaseHoras(e.target.value as 'ESTIMADAS' | 'REALES')}
                    style={{ width: '100%', fontSize: '13px', flex: 1 }}
                  >
                    <option value="ESTIMADAS">Horas estimadas ({horasEstimadas}h)</option>
                    <option value="REALES" disabled={!horasReales}>
                      Horas reales {horasReales ? `(${horasReales}h)` : '(sin registrar)'}
                    </option>
                  </select>
                </div>
              )}

              {/* Tarifa o monto fijo */}
              {modoPago !== 'MONTO_FIJO' ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelSt}>{modoPago === 'POR_HORA' ? 'Tarifa por hora ($)' : 'Tarifa por día ($)'}</label>
                  <input type="number" value={tarifa} onChange={(e) => setTarifa(e.target.value)} min="0" step="50" style={{ fontSize: '13px', flex: 1 }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelSt}>Monto fijo total ($)</label>
                  <input type="number" value={montoFijo} onChange={(e) => setMontoFijo(e.target.value)} placeholder="Ej. 5000" min="0" style={{ fontSize: '13px', flex: 1 }} />
                </div>
              )}

              {/* Preview */}
              <div style={{
                backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '6px',
                padding: '8px 12px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '4px', textAlign: 'center' }}>
                  {modoPago === 'POR_HORA'
                    ? `${horasActivas}h × $${tarifa}/hr`
                    : modoPago === 'POR_DIA'
                    ? `${Math.ceil(horasActivas / 8) || 1} día(s) × $${tarifa}`
                    : 'Monto fijo'}
                  {modoPago !== 'MONTO_FIJO' && (
                    <span style={{ color: '#4b5563', display: 'block' }}>
                      base: {baseHoras === 'REALES' ? 'reales' : 'estimadas'}
                    </span>
                  )}
                </p>
                <p style={{ fontSize: '18px', fontWeight: '700', color: '#a78bfa', margin: 0 }}>
                  ${montoPreview.toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          {/* Info de solo lectura */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
            <InfoField label="Colaborador"  value={modulo.colaborador.nombre} />
            <InfoField label="Proyecto"     value={modulo.proyecto.nombre} />
            <InfoField label="Tarifa/hora"  value={`$${modulo.tarifaHora}/hr`} />
            <InfoField label="Creado"       value={new Date(modulo.createdAt).toLocaleDateString('es-MX')} />
            {modulo.fechaEntrega && (
              <InfoField label="Entregado" value={new Date(modulo.fechaEntrega).toLocaleDateString('es-MX')} />
            )}
            {modulo.notasIA && (
              <div style={{ gridColumn: '1 / -1' }}>
                <InfoField label="Análisis IA" value={modulo.notasIA} />
              </div>
            )}
          </div>

          {/* ── Estado de pago ── */}
          {modulo.montoTotal != null && modulo.montoTotal > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                onClick={toggling ? undefined : handleTogglePago}
                style={{
                  width: '40px',
                  height: '22px',
                  borderRadius: '11px',
                  backgroundColor: modulo.pagado ? '#10b981' : '#2a2a3a',
                  position: 'relative',
                  cursor: toggling ? 'wait' : 'pointer',
                  transition: 'background-color 0.2s',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    position: 'absolute',
                    top: '3px',
                    left: modulo.pagado ? '21px' : '3px',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  }}
                />
              </div>
              <span style={{ fontSize: '13px', color: modulo.pagado ? '#10b981' : '#6b7280' }}>
                {modulo.pagado ? 'Pagado' : 'Sin pagar'}
              </span>
            </div>
          )}

          {/* Botón guardar cambios */}
          {dirty && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                }}
              >
                <Save size={13} />
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helpers de UI ───────────────────────────────────────────────────────────
const labelSt: React.CSSProperties = {
  fontSize: '10px',
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: '4px',
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={labelSt}>{label}</span>
      <span style={{ fontSize: '13px', color: '#9ca3af' }}>{value}</span>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function ModulosPage() {
  const [modulos, setModulos]             = useState<Modulo[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [proyectos, setProyectos]         = useState<Proyecto[]>([])
  const [loading, setLoading]             = useState(true)
  const isMobile = useIsMobile()

  const [filtros, setFiltros] = useState({
    colaboradorId: '',
    proyectoId: '',
    estado: '',
    complejidad: '',
    busqueda: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtros.colaboradorId) params.set('colaboradorId', filtros.colaboradorId)
      if (filtros.proyectoId)    params.set('proyectoId',    filtros.proyectoId)
      if (filtros.estado)        params.set('estado',        filtros.estado)
      if (filtros.complejidad)   params.set('complejidad',   filtros.complejidad)

      const [modulosRes, colsRes, projsRes] = await Promise.all([
        fetch(`/api/modulos?${params}`).then((r) => r.json()),
        fetch('/api/colaboradores').then((r) => r.json()),
        fetch('/api/proyectos').then((r) => r.json()),
      ])
      setModulos(Array.isArray(modulosRes) ? modulosRes : [])
      setColaboradores(colsRes)
      setProyectos(projsRes)
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => { fetchData() }, [fetchData])

  const handleUpdate = useCallback((id: string, data: Partial<Modulo>) => {
    setModulos((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)))
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar este módulo?')) return
    await fetch(`/api/modulos/${id}`, { method: 'DELETE' })
    setModulos((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const modulosFiltrados = modulos.filter((m) =>
    filtros.busqueda
      ? m.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        m.colaborador.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase())
      : true
  )

  const totalMonto  = modulosFiltrados.reduce((a, m) => a + (m.montoTotal  ?? 0), 0)
  const totalPagado = modulosFiltrados.reduce((a, m) => a + m.montoPagado,         0)

  return (
    <div>
      <PageHeader title="Todos los módulos" subtitle="Lista completa con filtros" onRefresh={fetchData} />
      <div style={{ padding: isMobile ? '14px' : '24px 32px' }}>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {!isMobile && (
            <>
              <select value={filtros.colaboradorId} onChange={(e) => setFiltros({ ...filtros, colaboradorId: e.target.value })}>
                <option value="">Todos los devs</option>
                {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select value={filtros.proyectoId} onChange={(e) => setFiltros({ ...filtros, proyectoId: e.target.value })}>
                <option value="">Todos los proyectos</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </>
          )}
          <select value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })} style={{ flex: isMobile ? 1 : 'none' }}>
            <option value="">Todos los estatus</option>
            {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {!isMobile && (
            <select value={filtros.complejidad} onChange={(e) => setFiltros({ ...filtros, complejidad: e.target.value })}>
              <option value="">Todas las complejidades</option>
              {Object.entries(COMPLEJIDAD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
          <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : '180px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
              placeholder="Buscar módulo..."
              style={{ paddingLeft: '30px' }}
            />
          </div>
          {isMobile && (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <select value={filtros.colaboradorId} onChange={(e) => setFiltros({ ...filtros, colaboradorId: e.target.value })} style={{ flex: 1 }}>
                <option value="">Todos los devs</option>
                {colaboradores.map((c) => <option key={c.id} value={c.id}>{c.nombre.split(' ')[0]}</option>)}
              </select>
              <select value={filtros.proyectoId} onChange={(e) => setFiltros({ ...filtros, proyectoId: e.target.value })} style={{ flex: 1 }}>
                <option value="">Todos los proyectos</option>
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Header de columnas — solo desktop */}
        {!loading && !isMobile && modulosFiltrados.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 110px 100px 110px 90px 72px',
            gap: '10px', padding: '6px 14px',
            fontSize: '10px', color: '#4b5563',
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px',
          }}>
            <span>Módulo</span><span>Tipo</span><span>Complejidad</span>
            <span>Horas</span><span>Estado</span><span>Monto</span><span></span>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>Cargando...</div>
        ) : modulosFiltrados.length === 0 ? (
          <div style={{ backgroundColor: '#3b82f610', border: '1px solid #3b82f630', borderRadius: '8px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} color="#60a5fa" />
            <span style={{ color: '#60a5fa', fontSize: '14px' }}>No hay módulos con esos filtros.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '6px' }}>
            {modulosFiltrados.map((m) => (
              <ModuloRow
                key={m.id}
                modulo={m}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}

        {/* Totales */}
        {modulosFiltrados.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#6b7280' }}>
            <span>{modulosFiltrados.length} módulo{modulosFiltrados.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: '20px' }}>
              <span>Total: <strong style={{ color: '#e2e8f0' }}>${totalMonto.toFixed(0)}</strong></span>
              <span>Pagado: <strong style={{ color: '#10b981' }}>${totalPagado.toFixed(0)}</strong></span>
              <span>Pendiente: <strong style={{ color: '#f59e0b' }}>${(totalMonto - totalPagado).toFixed(0)}</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
