'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import { PlusCircle, Sparkles, RotateCcw, Send } from 'lucide-react'
import { TIPOS_TAREA, COMPLEJIDADES, TIPO_TAREA_LABELS, COMPLEJIDAD_LABELS, detectarAlertaHoras } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Colaborador { id: string; nombre: string }
interface Proyecto    { id: string; nombre: string }
interface Config      { tarifa_dia: string; horas_dia: string; anthropic_api_key: string }

const labelStyle = {
  fontSize: '11px', color: '#6b7280',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em', marginBottom: '6px', display: 'block',
}

export default function RegistrarPage() {
  const router    = useRouter()
  const isMobile  = useIsMobile()
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [proyectos, setProyectos]         = useState<Proyecto[]>([])
  const [config, setConfig]               = useState<Config>({ tarifa_dia: '500', horas_dia: '4', anthropic_api_key: '' })
  const [loading, setLoading]             = useState(false)
  const [analizando, setAnalizando]       = useState(false)
  const [analisisIA, setAnalisisIA]       = useState<string | null>(null)
  const [error, setError]                 = useState<string | null>(null)
  const [success, setSuccess]             = useState(false)

  const [form, setForm] = useState({
    nombre: '', proyectoId: '', colaboradorId: '',
    tipoTarea: 'DESARROLLO', complejidad: 'MEDIA',
    horasEstimadas: '', descripcion: '',
    fechaInicio: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/colaboradores').then(r => r.json()),
      fetch('/api/proyectos').then(r => r.json()),
      fetch('/api/configuracion').then(r => r.json()),
    ]).then(([cols, projs, cfg]) => {
      setColaboradores(cols)
      setProyectos(projs)
      if (cfg && !cfg.error) setConfig(cfg)
      if (cols.length  > 0) setForm(f => ({ ...f, colaboradorId: cols[0].id }))
      if (projs.length > 0) setForm(f => ({ ...f, proyectoId:    projs[0].id }))
    })
  }, [])

  const tarifaHora = parseFloat(config.tarifa_dia) / parseFloat(config.horas_dia) || 125
  const alerta     = form.horasEstimadas
    ? detectarAlertaHoras(parseFloat(form.horasEstimadas), form.complejidad)
    : null

  const handleLimpiar = () => {
    setForm({ nombre: '', proyectoId: proyectos[0]?.id || '', colaboradorId: colaboradores[0]?.id || '',
      tipoTarea: 'DESARROLLO', complejidad: 'MEDIA', horasEstimadas: '', descripcion: '',
      fechaInicio: new Date().toISOString().split('T')[0] })
    setAnalisisIA(null); setError(null)
  }

  const handleAnalizarIA = async () => {
    if (!form.nombre || !form.horasEstimadas) { setError('Completa nombre y horas'); return }
    setAnalizando(true); setAnalisisIA(null)
    try {
      if (!config.anthropic_api_key) {
        const { alerta: a, mensaje } = detectarAlertaHoras(parseFloat(form.horasEstimadas), form.complejidad)
        setAnalisisIA(a ? `⚠️ ${mensaje}` : `✅ Estimación razonable para complejidad ${COMPLEJIDAD_LABELS[form.complejidad]}.`)
        return
      }
      const res  = await fetch('/api/analisis-ia', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, apiKey: config.anthropic_api_key }) })
      const data = await res.json()
      setAnalisisIA(data.analisis || 'Sin análisis')
    } catch { setAnalisisIA('Error al conectar con IA') }
    finally  { setAnalizando(false) }
  }

  const handleSubmit = async () => {
    if (!form.nombre || !form.colaboradorId || !form.proyectoId || !form.horasEstimadas) {
      setError('Completa todos los campos requeridos'); return
    }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/modulos', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tarifaHora }) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error') }
      setSuccess(true)
      setTimeout(() => router.push('/panel/modulos'), 1500)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
    finally { setLoading(false) }
  }

  const cols1 = isMobile ? '1fr' : '1fr 1fr'
  const pad   = isMobile ? '16px' : '24px 32px'

  return (
    <div>
      <PageHeader title="Registrar módulo" subtitle="Envía un nuevo módulo para aprobación" />
      <div style={{ padding: pad }}>
        <div style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '10px', padding: isMobile ? '16px' : '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
            <PlusCircle size={15} color="#7c3aed" />
            <span style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '13px' }}>NUEVO MÓDULO</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: cols1, gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Nombre del módulo</label>
              <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Login con roles" />
            </div>
            <div>
              <label style={labelStyle}>Proyecto</label>
              <select value={form.proyectoId} onChange={e => setForm({ ...form, proyectoId: e.target.value })} style={{ width: '100%' }}>
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: cols1, gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Colaborador</label>
              <select value={form.colaboradorId} onChange={e => setForm({ ...form, colaboradorId: e.target.value })} style={{ width: '100%' }}>
                {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Tipo de tarea</label>
              <select value={form.tipoTarea} onChange={e => setForm({ ...form, tipoTarea: e.target.value })} style={{ width: '100%' }}>
                {TIPOS_TAREA.map(t => <option key={t} value={t}>{TIPO_TAREA_LABELS[t]}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: cols1, gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Complejidad</label>
              <select value={form.complejidad} onChange={e => setForm({ ...form, complejidad: e.target.value })} style={{ width: '100%' }}>
                {COMPLEJIDADES.map(c => <option key={c} value={c}>{COMPLEJIDAD_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Horas estimadas</label>
              <input type="number" value={form.horasEstimadas} onChange={e => setForm({ ...form, horasEstimadas: e.target.value })} placeholder="Ej. 8" min="0.5" step="0.5" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: cols1, gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Fecha de inicio</label>
              <input type="date" value={form.fechaInicio} onChange={e => setForm({ ...form, fechaInicio: e.target.value })} style={{ colorScheme: 'dark' }} />
            </div>
          </div>

          {alerta?.alerta && (
            <div style={{ backgroundColor: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#f59e0b' }}>
              ⚠️ {alerta.mensaje}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Describe qué hará este módulo..." rows={isMobile ? 3 : 4} style={{ resize: 'vertical' }} />
          </div>

          {analisisIA && (
            <div style={{ backgroundColor: '#7c3aed15', border: '1px solid #7c3aed40', borderRadius: '6px', padding: '12px 16px', marginBottom: '14px', fontSize: '13px', color: '#c4b5fd' }}>
              <strong style={{ color: '#a78bfa' }}>Análisis IA:</strong> {analisisIA}
            </div>
          )}
          {error && (
            <div style={{ backgroundColor: '#ef444415', border: '1px solid #ef444440', borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#f87171' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ backgroundColor: '#10b98115', border: '1px solid #10b98140', borderRadius: '6px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#34d399' }}>
              ✅ Módulo creado. Redirigiendo...
            </div>
          )}

          {form.horasEstimadas && (
            <div style={{ marginBottom: '14px', fontSize: '13px', color: '#9ca3af' }}>
              Monto estimado: <strong style={{ color: '#10b981' }}>${(parseFloat(form.horasEstimadas) * tarifaHora).toFixed(0)}</strong> ({form.horasEstimadas}h × ${tarifaHora.toFixed(0)}/hr)
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleLimpiar} style={{ backgroundColor: 'transparent', border: '1px solid #2a2a3a', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={13} /> Limpiar
            </button>
            <button onClick={handleAnalizarIA} disabled={analizando} style={{ backgroundColor: '#1a1a24', border: '1px solid #7c3aed', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} /> {analizando ? 'Analizando...' : 'Analizar IA'}
            </button>
            <button onClick={handleSubmit} disabled={loading || success} style={{ backgroundColor: '#7c3aed', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send size={13} /> {loading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
