'use client'

import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/PageHeader'
import { Search, Trash2, CheckCircle, Clock, AlertTriangle, Edit2, X, Save } from 'lucide-react'
import {
  COMPLEJIDAD_LABELS, ESTADO_LABELS, TIPO_TAREA_LABELS,
  TIPOS_TAREA, COMPLEJIDADES
} from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Pago { id: string; monto: number; fecha: string; notas: string | null }

interface Modulo {
  id: string; nombre: string; descripcion: string | null
  tipoTarea: string; complejidad: string
  horasEstimadas: number; horasReales: number | null
  montoTotal: number | null; montoPagado: number; pagado: boolean
  estado: string; alertaHoras: boolean; notasIA: string | null
  createdAt: string; fechaEntrega: string | null
  tarifaHora: number; modoPago: string; montoFijo: number | null
  colaborador: { id: string; nombre: string }
  proyecto: { id: string; nombre: string }
  pagos: Pago[]
}

interface Colaborador { id: string; nombre: string }
interface Proyecto    { id: string; nombre: string }

const ESTADO_COLORS: Record<string, { bg: string; text: string }> = {
  PENDIENTE: { bg: '#f59e0b15', text: '#f59e0b' },
  EN_CURSO:  { bg: '#3b82f615', text: '#60a5fa' },
  ENTREGADO: { bg: '#10b98115', text: '#34d399' },
  APROBADO:  { bg: '#10b98120', text: '#10b981' },
  RECHAZADO: { bg: '#ef444415', text: '#f87171' },
}

const labelSt: React.CSSProperties = {
  fontSize: '10px', color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  display: 'block', marginBottom: '4px',
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={labelSt}>{label}</span>
      <span style={{ fontSize: '13px', color: '#9ca3af' }}>{value}</span>
    </div>
  )
}

// ─── Modal de edición ────────────────────────────────────────────────────────
function ModuloModal({ modulo, onClose, onUpdate }: {
  modulo: Modulo
  onClose: () => void
  onUpdate: (id: string, data: Partial<Modulo>) => void
}) {
  const isMobile = useIsMobile()
  const [saving, setSaving]     = useState(false)
  const [toggling, setToggling] = useState(false)

  const [estado, setEstado]                 = useState(modulo.estado)
  const [horasEstimadas, setHorasEstimadas] = useState(String(modulo.horasEstimadas))
  const [horasReales, setHorasReales]       = useState(String(modulo.horasReales ?? ''))
  const [descripcion, setDescripcion]       = useState(modulo.descripcion ?? '')
  const [tipoTarea, setTipoTarea]           = useState(modulo.tipoTarea)
  const [complejidad, setComplejidad]       = useState(modulo.complejidad)
  const [modoPago, setModoPago]             = useState(modulo.modoPago ?? 'POR_HORA')
  const [tarifa, setTarifa]                 = useState(String(modulo.tarifaHora ?? 500))
  const [montoFijo, setMontoFijo]           = useState(String(modulo.montoFijo ?? ''))
  const [baseHoras, setBaseHoras]           = useState<'ESTIMADAS' | 'REALES'>('ESTIMADAS')

  const horasActivas = baseHoras === 'REALES' && horasReales
    ? parseFloat(horasReales) || 0
    : parseFloat(horasEstimadas) || 0

  const montoPreview = (() => {
    const t = parseFloat(tarifa) || 0
    if (modoPago === 'POR_HORA')   return t * horasActivas
    if (modoPago === 'POR_DIA')    return t * (Math.ceil(horasActivas / 8) || 1)
    if (modoPago === 'MONTO_FIJO') return parseFloat(montoFijo) || 0
    return 0
  })()

  const dirty = estado !== modulo.estado || horasEstimadas !== String(modulo.horasEstimadas) ||
    horasReales !== String(modulo.horasReales ?? '') || descripcion !== (modulo.descripcion ?? '') ||
    tipoTarea !== modulo.tipoTarea || complejidad !== modulo.complejidad ||
    modoPago !== (modulo.modoPago ?? 'POR_HORA') || tarifa !== String(modulo.tarifaHora ?? 500) ||
    montoFijo !== String(modulo.montoFijo ?? '')

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
          tipoTarea, complejidad, modoPago,
          tarifaHora: parseFloat(tarifa) || 500,
          montoFijo: modoPago === 'MONTO_FIJO' ? (parseFloat(montoFijo) || null) : null,
          _horasParaPago: horasActivas,
          ...(estado === 'APROBADO' && !modulo.fechaEntrega ? { fechaEntrega: new Date().toISOString() } : {}),
        }),
      })
      if (res.ok) { const u = await res.json(); onUpdate(modulo.id, u); onClose() }
    } finally { setSaving(false) }
  }

  const handleTogglePago = async () => {
    setToggling(true)
    try {
      const nuevoPagado = !modulo.pagado
      const res = await fetch(`/api/modulos/${modulo.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagado: nuevoPagado, montoPagado: nuevoPagado ? (modulo.montoTotal ?? 0) : 0 }),
      })
      if (res.ok) { const u = await res.json(); onUpdate(modulo.id, u) }
    } finally { setToggling(false) }
  }

  const cols2 = isMobile ? '1fr 1fr' : '1fr 1fr 1fr'
  const cols3 = isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr'

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center', padding: isMobile ? '0' : '16px',
      }}
    >
      <div style={{
        backgroundColor: '#1a1a24',
        border: '1px solid #2a2a3a',
        borderRadius: isMobile ? '16px 16px 0 0' : '12px',
        width: '100%',
        maxWidth: isMobile ? '100%' : '780px',
        maxHeight: isMobile ? '92vh' : '90vh',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header del modal */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '18px 20px', borderBottom: '1px solid #2a2a3a', flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
            <h2 style={{ fontSize: isMobile ? '15px' : '16px', fontWeight: '700', color: '#e2e8f0', marginBottom: '3px' }}>
              {modulo.nombre}
            </h2>
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {modulo.proyecto.nombre} · {modulo.colaborador.nombre}
            </span>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6b7280', padding: '4px', display: 'flex', flexShrink: 0 }}>
            <X size={20} />
          </button>
        </div>

        {/* Contenido del modal */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>

          {/* Fila 1: estado, horas est, horas real */}
          <div style={{ display: 'grid', gridTemplateColumns: cols2, gap: '12px' }}>
            <div>
              <label style={labelSt}>Estado</label>
              <select value={estado} onChange={e => setEstado(e.target.value)} style={{ width: '100%', fontSize: '13px' }}>
                {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={labelSt}>Horas estimadas</label>
              <input type="number" value={horasEstimadas} onChange={e => setHorasEstimadas(e.target.value)} min="0" step="0.5" style={{ fontSize: '13px' }} />
            </div>
            <div>
              <label style={labelSt}>Horas reales</label>
              <input type="number" value={horasReales} onChange={e => setHorasReales(e.target.value)} placeholder="Sin registrar" min="0" step="0.5" style={{ fontSize: '13px' }} />
            </div>
            <div>
              <label style={labelSt}>Tipo de tarea</label>
              <select value={tipoTarea} onChange={e => setTipoTarea(e.target.value)} style={{ width: '100%', fontSize: '13px' }}>
                {TIPOS_TAREA.map(t => <option key={t} value={t}>{TIPO_TAREA_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label style={labelSt}>Complejidad</label>
              <select value={complejidad} onChange={e => setComplejidad(e.target.value)} style={{ width: '100%', fontSize: '13px' }}>
                {COMPLEJIDADES.map(c => <option key={c} value={c}>{COMPLEJIDAD_LABELS[c]}</option>)}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label style={labelSt}>Descripción</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} style={{ fontSize: '13px', resize: 'vertical' }} />
          </div>

          {/* Configuración de pago */}
          <div style={{ backgroundColor: '#13131a', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '14px' }}>
            <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Configuración de pago
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: cols3, gap: '12px', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelSt}>Modo</label>
                <select value={modoPago} onChange={e => {
                  setModoPago(e.target.value)
                  if (e.target.value === 'POR_HORA')   setTarifa('500')
                  if (e.target.value === 'POR_DIA')    setTarifa('4000')
                  if (e.target.value === 'MONTO_FIJO') setMontoFijo('')
                }} style={{ width: '100%', fontSize: '13px', flex: 1 }}>
                  <option value="POR_HORA">Por hora</option>
                  <option value="POR_DIA">Por día</option>
                  <option value="MONTO_FIJO">Monto fijo</option>
                </select>
              </div>
              {modoPago !== 'MONTO_FIJO' && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={labelSt}>Base de cálculo</label>
                  <select value={baseHoras} onChange={e => setBaseHoras(e.target.value as 'ESTIMADAS' | 'REALES')} style={{ width: '100%', fontSize: '13px', flex: 1 }}>
                    <option value="ESTIMADAS">Estimadas ({horasEstimadas}h)</option>
                    <option value="REALES" disabled={!horasReales}>Reales {horasReales ? `(${horasReales}h)` : '(sin registrar)'}</option>
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelSt}>{modoPago === 'MONTO_FIJO' ? 'Monto fijo ($)' : modoPago === 'POR_HORA' ? 'Tarifa/hora ($)' : 'Tarifa/día ($)'}</label>
                {modoPago !== 'MONTO_FIJO'
                  ? <input type="number" value={tarifa} onChange={e => setTarifa(e.target.value)} min="0" step="50" style={{ fontSize: '13px', flex: 1 }} />
                  : <input type="number" value={montoFijo} onChange={e => setMontoFijo(e.target.value)} placeholder="Ej. 5000" min="0" style={{ fontSize: '13px', flex: 1 }} />
                }
              </div>
              <div style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '6px', padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px', textAlign: 'center' }}>
                  {modoPago === 'POR_HORA' ? `${horasActivas}h × $${tarifa}/hr` : modoPago === 'POR_DIA' ? `${Math.ceil(horasActivas / 8) || 1}d × $${tarifa}` : 'Fijo'}
                </p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#a78bfa', margin: 0 }}>${montoPreview.toFixed(0)}</p>
              </div>
            </div>
          </div>

          {/* Info lectura */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '10px' }}>
            <InfoField label="Colaborador" value={modulo.colaborador.nombre} />
            <InfoField label="Proyecto"    value={modulo.proyecto.nombre} />
            <InfoField label="Tarifa/hr"   value={`$${modulo.tarifaHora}/hr`} />
            <InfoField label="Creado"      value={new Date(modulo.createdAt).toLocaleDateString('es-MX')} />
            {modulo.fechaEntrega && <InfoField label="Entregado" value={new Date(modulo.fechaEntrega).toLocaleDateString('es-MX')} />}
            {modulo.notasIA && <div style={{ gridColumn: '1 / -1' }}><InfoField label="Análisis IA" value={modulo.notasIA} /></div>}
          </div>

          {/* Toggle pago */}
          {(modulo.montoTotal ?? 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', backgroundColor: '#13131a', borderRadius: '8px' }}>
              <div onClick={toggling ? undefined : handleTogglePago}
                style={{ width: '40px', height: '22px', borderRadius: '11px', backgroundColor: modulo.pagado ? '#10b981' : '#2a2a3a', position: 'relative', cursor: toggling ? 'wait' : 'pointer', transition: 'background-color 0.2s', flexShrink: 0 }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '3px', left: modulo.pagado ? '21px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
              </div>
              <div>
                <span style={{ fontSize: '13px', color: modulo.pagado ? '#10b981' : '#9ca3af', fontWeight: '500' }}>
                  {modulo.pagado ? 'Pagado' : 'Sin pagar'}
                </span>
                <span style={{ fontSize: '11px', color: '#4b5563', marginLeft: '8px' }}>
                  ${(modulo.montoTotal ?? 0).toFixed(0)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer del modal */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid #2a2a3a', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ backgroundColor: 'transparent', border: '1px solid #2a2a3a', color: '#9ca3af' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !dirty}
            style={{ backgroundColor: dirty ? '#7c3aed' : '#2a2a3a', color: dirty ? 'white' : '#4b5563', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <Save size={13} />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Fila de módulo (sin expansión, solo muestra datos + botón editar) ────────
function ModuloRow({ modulo, onEdit, onDelete, isMobile }: {
  modulo: Modulo
  onEdit: (m: Modulo) => void
  onDelete: (id: string) => void
  isMobile: boolean
}) {
  const estadoColor = ESTADO_COLORS[modulo.estado] || { bg: '#2a2a3a', text: '#9ca3af' }

  return (
    <div style={{
      backgroundColor: '#1a1a24',
      border: `1px solid ${modulo.alertaHoras ? '#f59e0b30' : '#2a2a3a'}`,
      borderRadius: '8px',
    }}>
      {isMobile ? (
        <div style={{ padding: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>{modulo.nombre}</span>
                {modulo.alertaHoras && <AlertTriangle size={12} color="#f59e0b" />}
                {modulo.pagado       && <CheckCircle  size={12} color="#10b981" />}
              </div>
              <span style={{ fontSize: '11px', color: '#4b5563' }}>
                {modulo.proyecto.nombre} · {modulo.colaborador.nombre.split(' ')[0]}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <button onClick={() => onEdit(modulo)}
                style={{ background: 'none', border: 'none', color: '#7c3aed', padding: '4px', display: 'flex' }} title="Editar">
                <Edit2 size={14} />
              </button>
              <button onClick={() => onDelete(modulo.id)}
                style={{ background: 'none', border: 'none', color: '#374151', padding: '4px', display: 'flex' }} title="Eliminar">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', backgroundColor: estadoColor.bg, color: estadoColor.text, padding: '3px 8px', borderRadius: '4px' }}>
              {ESTADO_LABELS[modulo.estado] ?? modulo.estado}
            </span>
            <span style={{ fontSize: '11px', color: '#6b7280', backgroundColor: '#1e1e2e', padding: '3px 8px', borderRadius: '4px' }}>
              {TIPO_TAREA_LABELS[modulo.tipoTarea] ?? modulo.tipoTarea}
            </span>
            <span style={{ fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={10} />{modulo.horasEstimadas}h
              {modulo.horasReales ? ` / ${modulo.horasReales}h real` : ''}
            </span>
            {modulo.montoTotal != null && (
              <span style={{ fontSize: '13px', fontWeight: '700', color: modulo.pagado ? '#10b981' : '#f59e0b', marginLeft: 'auto' }}>
                ${modulo.montoTotal.toFixed(0)}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 100px 110px 90px 72px', gap: '10px', padding: '11px 14px', alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {modulo.nombre}
              </span>
              {modulo.alertaHoras && <AlertTriangle size={11} color="#f59e0b" style={{ flexShrink: 0 }} />}
              {modulo.pagado       && <CheckCircle  size={11} color="#10b981" style={{ flexShrink: 0 }} />}
            </div>
            <span style={{ fontSize: '11px', color: '#4b5563' }}>
              {modulo.proyecto.nombre} · {modulo.colaborador.nombre.split(' ')[0]}
            </span>
          </div>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>{TIPO_TAREA_LABELS[modulo.tipoTarea] ?? modulo.tipoTarea}</span>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>{COMPLEJIDAD_LABELS[modulo.complejidad] ?? modulo.complejidad}</span>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={10} />{modulo.horasEstimadas}h est.
            </div>
            {modulo.horasReales != null && <div style={{ color: '#6b7280', fontSize: '11px' }}>{modulo.horasReales}h real</div>}
          </div>
          <span style={{ fontSize: '11px', backgroundColor: estadoColor.bg, color: estadoColor.text, padding: '3px 8px', borderRadius: '4px', display: 'inline-block', whiteSpace: 'nowrap' }}>
            {ESTADO_LABELS[modulo.estado] ?? modulo.estado}
          </span>
          <div style={{ fontSize: '12px' }}>
            {modulo.montoTotal != null && (
              <div style={{ color: modulo.pagado ? '#10b981' : '#f59e0b', fontWeight: '600' }}>
                ${modulo.montoTotal.toFixed(0)}
              </div>
            )}
            {modulo.montoPagado > 0 && !modulo.pagado && (
              <div style={{ color: '#6b7280', fontSize: '11px' }}>${modulo.montoPagado.toFixed(0)} pag.</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
            <button onClick={() => onEdit(modulo)}
              style={{ background: 'none', border: 'none', color: '#7c3aed', padding: '4px', display: 'flex' }} title="Editar">
              <Edit2 size={13} />
            </button>
            <button onClick={() => onDelete(modulo.id)}
              style={{ background: 'none', border: 'none', color: '#374151', padding: '4px', display: 'flex' }} title="Eliminar">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function ModulosPage() {
  const [modulos, setModulos]             = useState<Modulo[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [proyectos, setProyectos]         = useState<Proyecto[]>([])
  const [loading, setLoading]             = useState(true)
  const [moduloEditando, setModuloEditando] = useState<Modulo | null>(null)
  const isMobile = useIsMobile()

  const [filtros, setFiltros] = useState({
    colaboradorId: '', proyectoId: '', estado: '', complejidad: '', busqueda: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtros.colaboradorId) params.set('colaboradorId', filtros.colaboradorId)
      if (filtros.proyectoId)    params.set('proyectoId',    filtros.proyectoId)
      if (filtros.estado)        params.set('estado',        filtros.estado)
      if (filtros.complejidad)   params.set('complejidad',   filtros.complejidad)

      const [mRes, cRes, pRes] = await Promise.all([
        fetch(`/api/modulos?${params}`).then(r => r.json()),
        fetch('/api/colaboradores').then(r => r.json()),
        fetch('/api/proyectos').then(r => r.json()),
      ])
      setModulos(Array.isArray(mRes) ? mRes : [])
      setColaboradores(cRes)
      setProyectos(pRes)
    } finally { setLoading(false) }
  }, [filtros])

  useEffect(() => { fetchData() }, [fetchData])

  const handleUpdate = useCallback((id: string, data: Partial<Modulo>) => {
    setModulos(prev => prev.map(m => m.id === id ? { ...m, ...data } : m))
    // Actualizar también el módulo que está en el modal
    setModuloEditando(prev => prev?.id === id ? { ...prev, ...data } : prev)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar este módulo?')) return
    await fetch(`/api/modulos/${id}`, { method: 'DELETE' })
    setModulos(prev => prev.filter(m => m.id !== id))
  }, [])

  const modulosFiltrados = modulos.filter(m =>
    filtros.busqueda
      ? m.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
        m.colaborador.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase())
      : true
  )

  const totalMonto     = modulosFiltrados.reduce((a, m) => a + (m.montoTotal ?? 0), 0)
  const totalPagado    = modulosFiltrados.reduce((a, m) => a + m.montoPagado, 0)
  const totalPorCobrar = modulosFiltrados
    .filter(m => !m.pagado && (m.montoTotal ?? 0) > 0)
    .reduce((a, m) => a + ((m.montoTotal ?? 0) - m.montoPagado), 0)

  return (
    <div>
      <PageHeader title="Todos los módulos" subtitle="Lista completa con filtros" onRefresh={fetchData} />
      <div style={{ padding: isMobile ? '14px' : '24px 32px' }}>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {!isMobile && (
            <>
              <select value={filtros.colaboradorId} onChange={e => setFiltros({ ...filtros, colaboradorId: e.target.value })}>
                <option value="">Todos los devs</option>
                {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <select value={filtros.proyectoId} onChange={e => setFiltros({ ...filtros, proyectoId: e.target.value })}>
                <option value="">Todos los proyectos</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </>
          )}
          <select value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })} style={{ flex: isMobile ? 1 : 'none' }}>
            <option value="">Todos los estatus</option>
            {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {!isMobile && (
            <select value={filtros.complejidad} onChange={e => setFiltros({ ...filtros, complejidad: e.target.value })}>
              <option value="">Todas las complejidades</option>
              {Object.entries(COMPLEJIDAD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
          <div style={{ position: 'relative', flex: 1, minWidth: isMobile ? '100%' : '180px' }}>
            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input value={filtros.busqueda} onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })}
              placeholder="Buscar módulo..." style={{ paddingLeft: '30px' }} />
          </div>
          {isMobile && (
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <select value={filtros.colaboradorId} onChange={e => setFiltros({ ...filtros, colaboradorId: e.target.value })} style={{ flex: 1 }}>
                <option value="">Todos los devs</option>
                {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre.split(' ')[0]}</option>)}
              </select>
              <select value={filtros.proyectoId} onChange={e => setFiltros({ ...filtros, proyectoId: e.target.value })} style={{ flex: 1 }}>
                <option value="">Todos los proyectos</option>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Header columnas desktop */}
        {!loading && !isMobile && modulosFiltrados.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 100px 110px 90px 72px', gap: '10px', padding: '6px 14px', fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
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
            {modulosFiltrados.map(m => (
              <ModuloRow key={m.id} modulo={m} isMobile={isMobile}
                onEdit={setModuloEditando}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Totales */}
        {modulosFiltrados.length > 0 && (
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#6b7280', flexWrap: 'wrap', gap: '8px' }}>
            <span>{modulosFiltrados.length} módulo{modulosFiltrados.length !== 1 ? 's' : ''}</span>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>Total: <strong style={{ color: '#e2e8f0' }}>${totalMonto.toFixed(0)}</strong></span>
              <span>Pagado: <strong style={{ color: '#10b981' }}>${totalPagado.toFixed(0)}</strong></span>
              <span>Por cobrar: <strong style={{ color: '#f59e0b' }}>${totalPorCobrar.toFixed(0)}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Modal de edición */}
      {moduloEditando && (
        <ModuloModal
          modulo={moduloEditando}
          onClose={() => setModuloEditando(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
