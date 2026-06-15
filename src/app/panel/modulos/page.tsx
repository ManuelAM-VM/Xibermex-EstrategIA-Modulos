'use client'

import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/PageHeader'
import { Search, Trash2, CheckCircle, Clock, AlertTriangle, Edit2, X, Save, Calendar } from 'lucide-react'
import {
  COMPLEJIDAD_LABELS, ESTADO_LABELS, TIPO_TAREA_LABELS,
  TIPOS_TAREA, COMPLEJIDADES, getQuincena, getQuincenaActual
} from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Pago { id: string; monto: number; fecha: string; notas: string | null }

interface Modulo {
  id: string; nombre: string; descripcion: string | null
  tipoTarea: string; complejidad: string
  horasEstimadas: number; horasReales: number | null
  horasNormales: number | null; horasExtra: number | null
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
  const [horasNormales, setHorasNormales]   = useState(String(modulo.horasNormales ?? ''))
  const [horasExtraVal, setHorasExtraVal]   = useState(String(modulo.horasExtra ?? ''))
  const [descripcion, setDescripcion]       = useState(modulo.descripcion ?? '')
  const [tipoTarea, setTipoTarea]           = useState(modulo.tipoTarea)
  const [complejidad, setComplejidad]       = useState(modulo.complejidad)
  const [modoPago, setModoPago]             = useState(modulo.modoPago ?? 'POR_HORA')
  const [tarifa, setTarifa]                 = useState(String(modulo.tarifaHora ?? 350))
  const [montoFijo, setMontoFijo]           = useState(String(modulo.montoFijo ?? ''))
  const [baseHoras, setBaseHoras]           = useState<'ESTIMADAS' | 'REALES'>('ESTIMADAS')
  // Config de pago por módulo
  const [tarifaDia, setTarifaDia]           = useState('350')
  const [horasPorDia, setHorasPorDia]       = useState('6')
  const [tarifaExtra, setTarifaExtra]       = useState('550')
  const [horasBloqueExtra, setHorasBloqueExtra] = useState('2')
  // Valores iniciales para detectar cambios
  const [tarifaDiaInit, setTarifaDiaInit]       = useState('350')
  const [horasPorDiaInit, setHorasPorDiaInit]   = useState('6')
  const [tarifaExtraInit, setTarifaExtraInit]   = useState('550')

  // Cargar config desde servidor
  useEffect(() => {
    fetch('/api/configuracion').then(r => r.json()).then(cfg => {
      if (cfg && !cfg.error) {
        const td = cfg.tarifa_dia || '350'
        const hd = cfg.horas_dia || '6'
        const te = cfg.tarifa_extra || '550'
        setTarifaDia(td); setTarifaDiaInit(td)
        setHorasPorDia(hd); setHorasPorDiaInit(hd)
        setTarifaExtra(te); setTarifaExtraInit(te)
        setHorasBloqueExtra(cfg.horas_bloque_extra || '2')
      }
    }).catch(() => {})
  }, [])

  // ¿Es un módulo del mes actual? Si no, los precios no se pueden modificar
  const esModuloActual = (() => {
    const now = new Date()
    const created = new Date(modulo.createdAt)
    return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()
  })()

  const horasActivas = baseHoras === 'REALES' && horasReales
    ? parseFloat(horasReales) || 0
    : parseFloat(horasEstimadas) || 0

  const montoPreview = (() => {
    if (modoPago === 'MONTO_FIJO') return parseFloat(montoFijo) || 0
    const td = parseFloat(tarifaDia) || 350
    const hd = parseFloat(horasPorDia) || 6
    const te = parseFloat(tarifaExtra) || 550
    // Si el usuario definió horas normales y extras manualmente, usar esas
    if (horasNormales || horasExtraVal) {
      const hn = parseFloat(horasNormales) || 0
      const he = parseFloat(horasExtraVal) || 0
      const diasManuales = Math.ceil(hn / hd) || (hn > 0 ? 1 : 0)
      return (diasManuales * td) + (he * te)
    }
    // Si no, calcular automáticamente
    const dias = Math.floor(horasActivas / hd)
    const horasRestantes = horasActivas % hd
    return (dias * td) + (horasRestantes * te)
  })()

  const estadoColor = ESTADO_COLORS[estado] || { bg: '#2a2a3a', text: '#9ca3af' }

  const dirty = estado !== modulo.estado || horasEstimadas !== String(modulo.horasEstimadas) ||
    horasReales !== String(modulo.horasReales ?? '') || descripcion !== (modulo.descripcion ?? '') ||
    tipoTarea !== modulo.tipoTarea || complejidad !== modulo.complejidad ||
    modoPago !== (modulo.modoPago ?? 'POR_HORA') || tarifa !== String(modulo.tarifaHora ?? 350) ||
    montoFijo !== String(modulo.montoFijo ?? '') ||
    horasNormales !== String(modulo.horasNormales ?? '') ||
    horasExtraVal !== String(modulo.horasExtra ?? '') ||
    tarifaDia !== tarifaDiaInit || horasPorDia !== horasPorDiaInit || tarifaExtra !== tarifaExtraInit

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
          horasNormales: horasNormales ? parseFloat(horasNormales) : null,
          horasExtra: horasExtraVal ? parseFloat(horasExtraVal) : null,
          descripcion: descripcion || null,
          tipoTarea, complejidad, modoPago,
          tarifaHora: parseFloat(tarifaDia) / parseFloat(horasPorDia) || 58,
          montoFijo: modoPago === 'MONTO_FIJO' ? (parseFloat(montoFijo) || null) : null,
          _horasParaPago: horasActivas,
          _tarifaDia: tarifaDia,
          _horasPorDia: horasPorDia,
          _tarifaExtra: tarifaExtra,
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

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600', marginBottom: '10px' }}>
      {children}
    </p>
  )

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        backgroundColor: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: isMobile ? 0 : '20px',
      }}
    >
      <div style={{
        backgroundColor: '#16161f', border: '1px solid #252535',
        borderRadius: isMobile ? '20px 20px 0 0' : '14px',
        width: '100%', maxWidth: isMobile ? '100%' : '720px',
        maxHeight: isMobile ? '94vh' : '88vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }}>
        {/* ── Header ── */}
        <div style={{ padding: isMobile ? '20px 20px 16px' : '22px 28px 18px', borderBottom: '1px solid #1e1e2e', flexShrink: 0 }}>
          {isMobile && <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#2a2a3a', margin: '0 auto 16px' }} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: isMobile ? '16px' : '17px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>{modulo.nombre}</h2>
                <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', backgroundColor: estadoColor.bg, color: estadoColor.text, fontWeight: '500', whiteSpace: 'nowrap' }}>
                  {ESTADO_LABELS[modulo.estado] ?? modulo.estado}
                </span>
                {modulo.alertaHoras && <span style={{ fontSize: '11px', color: '#f59e0b' }}>⚠️ Alerta horas</span>}
              </div>
              <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' }}>
                <span>{modulo.proyecto.nombre}</span>
                <span>{modulo.colaborador.nombre}</span>
                <span>{modulo.horasEstimadas}h</span>
                {modulo.montoTotal != null && <span style={{ color: modulo.pagado ? '#10b981' : '#f59e0b', fontWeight: '600' }}>${modulo.montoTotal.toFixed(0)}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: '#1e1e2e', border: '1px solid #2a2a3a', color: '#6b7280', borderRadius: '8px', padding: '7px', display: 'flex', flexShrink: 0, cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Cuerpo ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: isMobile ? '14px 16px' : '22px 28px', display: 'flex', flexDirection: 'column', gap: isMobile ? '14px' : '20px' }}>

          {/* Detalles */}
          <div>
            <SectionTitle>Detalles</SectionTitle>
            {/* En móvil: columna única para todos los selects */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {isMobile ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><label style={labelSt}>Estado</label>
                      <select value={estado} onChange={e => setEstado(e.target.value)} style={{ width: '100%', fontSize: '14px' }}>
                        {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div><label style={labelSt}>Complejidad</label>
                      <select value={complejidad} onChange={e => setComplejidad(e.target.value)} style={{ width: '100%', fontSize: '14px' }}>
                        {COMPLEJIDADES.map(c => <option key={c} value={c}>{COMPLEJIDAD_LABELS[c]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label style={labelSt}>Tipo de tarea</label>
                    <select value={tipoTarea} onChange={e => setTipoTarea(e.target.value)} style={{ width: '100%', fontSize: '14px' }}>
                      {TIPOS_TAREA.map(t => <option key={t} value={t}>{TIPO_TAREA_LABELS[t]}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div><label style={labelSt}>Estado</label>
                    <select value={estado} onChange={e => setEstado(e.target.value)} style={{ width: '100%', fontSize: '13px' }}>
                      {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div><label style={labelSt}>Tipo de tarea</label>
                    <select value={tipoTarea} onChange={e => setTipoTarea(e.target.value)} style={{ width: '100%', fontSize: '13px' }}>
                      {TIPOS_TAREA.map(t => <option key={t} value={t}>{TIPO_TAREA_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div><label style={labelSt}>Complejidad</label>
                    <select value={complejidad} onChange={e => setComplejidad(e.target.value)} style={{ width: '100%', fontSize: '13px' }}>
                      {COMPLEJIDADES.map(c => <option key={c} value={c}>{COMPLEJIDAD_LABELS[c]}</option>)}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label style={labelSt}>Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  rows={isMobile ? 3 : 5}
                  placeholder="Describe qué incluye este módulo..."
                  style={{
                    fontSize: isMobile ? '14px' : '13px',
                    resize: 'vertical', lineHeight: '1.6',
                    color: '#e2e8f0', backgroundColor: '#0f0f16',
                    border: '1px solid #2a2a3a', borderRadius: '8px',
                    padding: '10px 12px', width: '100%',
                    minHeight: isMobile ? '80px' : '110px',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#1e1e2e' }} />

          {/* Horas */}
          <div>
            <SectionTitle>Horas de trabajo</SectionTitle>

            {/* Totales */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <label style={labelSt}>Horas estimadas</label>
                <input type="number" value={horasEstimadas} onChange={e => setHorasEstimadas(e.target.value)} min="0" step="0.5" style={{ fontSize: isMobile ? '14px' : '13px' }} />
              </div>
              <div>
                <label style={labelSt}>Horas reales totales</label>
                <input type="number" value={horasReales} onChange={e => setHorasReales(e.target.value)} placeholder="—" min="0" step="0.5" style={{ fontSize: isMobile ? '14px' : '13px' }} />
              </div>
            </div>

            {/* Desglose día / extra */}
            <div style={{ backgroundColor: '#0f0f16', border: '1px solid #252535', borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '10px' }}>
                Desglose — define cuántas horas fueron regulares de día y cuántas extra.
                Si lo dejas en blanco se calcula automáticamente.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ ...labelSt, color: '#60a5fa' }}>Horas de día</label>
                  <input
                    type="number"
                    value={horasNormales}
                    onChange={e => {
                      setHorasNormales(e.target.value)
                      // Auto-calcular extras si hay total real
                      if (horasReales && e.target.value) {
                        const total = parseFloat(horasReales) || 0
                        const norm = parseFloat(e.target.value) || 0
                        if (total > norm) setHorasExtraVal(String(+(total - norm).toFixed(1)))
                      }
                    }}
                    placeholder={`Auto (${Math.floor((parseFloat(horasReales || horasEstimadas) || 0) / (parseFloat(horasPorDia) || 6)) * (parseFloat(horasPorDia) || 6)}h)`}
                    min="0" step="0.5"
                    style={{ fontSize: isMobile ? '14px' : '13px', borderColor: horasNormales ? '#3b82f640' : undefined }}
                  />
                </div>
                <div>
                  <label style={{ ...labelSt, color: '#f59e0b' }}>Horas extra</label>
                  <input
                    type="number"
                    value={horasExtraVal}
                    onChange={e => {
                      setHorasExtraVal(e.target.value)
                      // Auto-calcular normales si hay total real
                      if (horasReales && e.target.value) {
                        const total = parseFloat(horasReales) || 0
                        const extra = parseFloat(e.target.value) || 0
                        if (total > extra) setHorasNormales(String(+(total - extra).toFixed(1)))
                      }
                    }}
                    placeholder={`Auto (${((parseFloat(horasReales || horasEstimadas) || 0) % (parseFloat(horasPorDia) || 6)).toFixed(1)}h)`}
                    min="0" step="0.5"
                    style={{ fontSize: isMobile ? '14px' : '13px', borderColor: horasExtraVal ? '#f59e0b40' : undefined }}
                  />
                </div>
              </div>

              {/* Preview del desglose */}
              {(horasNormales || horasExtraVal || horasReales || horasEstimadas) && (
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', flexWrap: 'wrap' }}>
                  {(() => {
                    const hd = parseFloat(horasPorDia) || 6
                    const td = parseFloat(tarifaDia) || 350
                    const te = parseFloat(tarifaExtra) || 550
                    const base = parseFloat(horasReales || horasEstimadas) || 0
                    const hn = horasNormales ? parseFloat(horasNormales) : Math.floor(base / hd) * hd
                    const he = horasExtraVal ? parseFloat(horasExtraVal) : base % hd
                    const dias = Math.ceil(hn / hd) || (hn > 0 ? 1 : 0)
                    return (
                      <>
                        <span style={{ color: '#60a5fa' }}>
                          {dias} día(s) × ${td} = <strong>${(dias * td).toFixed(0)}</strong>
                        </span>
                        {he > 0 && (
                          <span style={{ color: '#f59e0b' }}>
                            {he}h extra × ${te} = <strong>${(he * te).toFixed(0)}</strong>
                          </span>
                        )}
                        <span style={{ color: '#a78bfa', marginLeft: 'auto', fontWeight: '700' }}>
                          Total: ${(dias * td + he * te).toFixed(0)}
                        </span>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: '#1e1e2e' }} />

          {/* Pago */}
          <div>
            <SectionTitle>Pago</SectionTitle>
            {isMobile ? (
              /* Móvil */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><label style={labelSt}>$/día</label>
                    <input type="number" value={tarifaDia} onChange={e => setTarifaDia(e.target.value)} min="0" step="50" style={{ fontSize: '14px' }} disabled={!esModuloActual} />
                  </div>
                  <div><label style={labelSt}>Hrs/día</label>
                    <input type="number" value={horasPorDia} onChange={e => setHorasPorDia(e.target.value)} min="1" step="1" style={{ fontSize: '14px' }} disabled={!esModuloActual} />
                  </div>
                  <div><label style={labelSt}>$/hr extra</label>
                    <input type="number" value={tarifaExtra} onChange={e => setTarifaExtra(e.target.value)} min="0" step="50" style={{ fontSize: '14px' }} disabled={!esModuloActual} />
                  </div>
                  <div><label style={labelSt}>Base</label>
                    <select value={baseHoras} onChange={e => setBaseHoras(e.target.value as 'ESTIMADAS' | 'REALES')} style={{ width: '100%', fontSize: '14px' }}>
                      <option value="ESTIMADAS">Estimadas ({horasEstimadas}h)</option>
                      <option value="REALES" disabled={!horasReales}>Reales {horasReales ? `(${horasReales}h)` : ''}</option>
                    </select>
                  </div>
                </div>
                {/* Resumen compacto móvil */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f0f16', border: '1px solid #252535', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div onClick={toggling ? undefined : handleTogglePago}
                      style={{ width: '44px', height: '24px', borderRadius: '12px', backgroundColor: modulo.pagado ? '#10b981' : '#2a2a3a', position: 'relative', cursor: toggling ? 'wait' : 'pointer', transition: 'background-color 0.2s', flexShrink: 0 }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '3px', left: modulo.pagado ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
                    </div>
                    <span style={{ fontSize: '14px', color: modulo.pagado ? '#10b981' : '#9ca3af', fontWeight: '500' }}>
                      {modulo.pagado ? 'Pagado' : 'Sin pagar'}
                    </span>
                  </div>
                  <p style={{ fontSize: '24px', fontWeight: '800', color: '#a78bfa', margin: 0, letterSpacing: '-0.5px' }}>${montoPreview.toFixed(0)}</p>
                </div>
              </div>
            ) : (
              /* Desktop */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
                  <div><label style={labelSt}>$/día</label>
                    <input type="number" value={tarifaDia} onChange={e => setTarifaDia(e.target.value)} min="0" step="50" style={{ fontSize: '13px' }} disabled={!esModuloActual} />
                  </div>
                  <div><label style={labelSt}>Hrs/día</label>
                    <input type="number" value={horasPorDia} onChange={e => setHorasPorDia(e.target.value)} min="1" step="1" style={{ fontSize: '13px' }} disabled={!esModuloActual} />
                  </div>
                  <div><label style={labelSt}>$/hr extra</label>
                    <input type="number" value={tarifaExtra} onChange={e => setTarifaExtra(e.target.value)} min="0" step="50" style={{ fontSize: '13px' }} disabled={!esModuloActual} />
                  </div>
                  <div><label style={labelSt}>Base</label>
                    <select value={baseHoras} onChange={e => setBaseHoras(e.target.value as 'ESTIMADAS' | 'REALES')} style={{ width: '100%', fontSize: '13px' }}>
                      <option value="ESTIMADAS">Estimadas ({horasEstimadas}h)</option>
                      <option value="REALES" disabled={!horasReales}>Reales {horasReales ? `(${horasReales}h)` : ''}</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0f0f16', border: '1px solid #252535', borderRadius: '10px', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div onClick={toggling ? undefined : handleTogglePago}
                      style={{ width: '44px', height: '24px', borderRadius: '12px', backgroundColor: modulo.pagado ? '#10b981' : '#2a2a3a', position: 'relative', cursor: toggling ? 'wait' : 'pointer', transition: 'background-color 0.2s', flexShrink: 0 }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '3px', left: modulo.pagado ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
                    </div>
                    <span style={{ fontSize: '13px', color: modulo.pagado ? '#10b981' : '#9ca3af', fontWeight: '500' }}>
                      {modulo.pagado ? 'Pagado' : 'Sin pagar'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: '#4b5563', marginBottom: '2px' }}>
                      {modoPago === 'MONTO_FIJO' ? 'Monto fijo' : `${Math.floor(horasActivas / (parseFloat(horasPorDia) || 6))}d × $${tarifaDia} + ${(horasActivas % (parseFloat(horasPorDia) || 6)).toFixed(0)}h extra × $${tarifaExtra}`}
                    </p>
                    <p style={{ fontSize: '22px', fontWeight: '800', color: '#a78bfa', margin: 0, letterSpacing: '-0.5px' }}>${montoPreview.toFixed(0)}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ height: '1px', backgroundColor: '#1e1e2e' }} />

          {/* Info */}
          <div>
            <SectionTitle>Información</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? '8px' : '10px' }}>
              {[
                { label: 'Colaborador', value: modulo.colaborador.nombre.split(' ')[0] },
                { label: 'Proyecto',    value: modulo.proyecto.nombre },
                { label: 'Tarifa',   value: `$${tarifaDia}/día + $${tarifaExtra}/hr extra` },
                { label: 'Creado',      value: new Date(modulo.createdAt).toLocaleDateString('es-MX') },
                ...(modulo.fechaEntrega ? [{ label: 'Entregado', value: new Date(modulo.fechaEntrega).toLocaleDateString('es-MX') }] : []),
              ].map(f => (
                <div key={f.label} style={{ backgroundColor: '#0f0f16', borderRadius: '8px', padding: isMobile ? '8px 10px' : '10px 12px' }}>
                  <p style={labelSt}>{f.label}</p>
                  <p style={{ fontSize: isMobile ? '13px' : '13px', color: '#cbd5e1', fontWeight: '500', margin: 0 }}>{f.value}</p>
                </div>
              ))}
              {modulo.notasIA && (
                <div style={{ gridColumn: '1 / -1', backgroundColor: '#7c3aed10', border: '1px solid #7c3aed20', borderRadius: '8px', padding: isMobile ? '8px 10px' : '10px 12px' }}>
                  <p style={labelSt}>✨ Análisis IA</p>
                  <p style={{ fontSize: '12px', color: '#c4b5fd', lineHeight: '1.5', margin: 0 }}>{modulo.notasIA}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* ── Footer ── */}
        <div style={{
          padding: isMobile ? '14px 20px calc(14px + env(safe-area-inset-bottom,0px))' : '16px 28px',
          borderTop: '1px solid #1e1e2e',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, backgroundColor: '#13131a',
        }}>
          <span style={{ fontSize: '12px', color: dirty ? '#f59e0b' : '#4b5563' }}>
            {dirty ? '● Cambios sin guardar' : 'Sin cambios'}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{ backgroundColor: 'transparent', border: '1px solid #2a2a3a', color: '#9ca3af', padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !dirty}
              style={{
                backgroundColor: dirty ? '#7c3aed' : '#1e1e2e',
                color: dirty ? 'white' : '#4b5563',
                border: 'none', padding: '8px 20px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '13px', fontWeight: '500',
                cursor: dirty && !saving ? 'pointer' : 'not-allowed',
              }}>
              <Save size={13} />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Fila de módulo ──────────────────────────────────────────────────────────
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
  const [ocultarPagadosAnteriores, setOcultarPagadosAnteriores] = useState(true)

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

  const quincenaActual = getQuincenaActual()

  const modulosFiltrados = modulos.filter(m => {
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase()
      if (!m.nombre.toLowerCase().includes(q) && !m.colaborador.nombre.toLowerCase().includes(q)) return false
    }
    if (ocultarPagadosAnteriores && m.pagado) {
      const mQ = getQuincena(m.createdAt)
      if (mQ.id !== quincenaActual.id) return false
    }
    return true
  })

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
          {/* Toggle ocultar pagados anteriores */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: isMobile ? '100%' : 'auto' }}>
            <button
              onClick={() => setOcultarPagadosAnteriores(!ocultarPagadosAnteriores)}
              style={{
                background: ocultarPagadosAnteriores ? '#7c3aed20' : 'transparent',
                border: `1px solid ${ocultarPagadosAnteriores ? '#7c3aed40' : '#2a2a3a'}`,
                color: ocultarPagadosAnteriores ? '#a78bfa' : '#6b7280',
                fontSize: '12px', padding: '6px 10px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
              }}
            >
              <Calendar size={12} />
              {ocultarPagadosAnteriores ? 'Solo quincena actual' : 'Todas las quincenas'}
            </button>
          </div>
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
