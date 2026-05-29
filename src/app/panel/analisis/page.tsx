'use client'

import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/PageHeader'
import { Sparkles, AlertTriangle, CheckCircle } from 'lucide-react'
import { COMPLEJIDAD_LABELS, HORAS_ESPERADAS, detectarAlertaHoras } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

interface Modulo {
  id: string; nombre: string; horasEstimadas: number
  complejidad: string; tipoTarea: string; descripcion: string | null
  notasIA: string | null; alertaHoras: boolean
  colaborador: { nombre: string }; proyecto: { nombre: string }
}

export default function AnalisisPage() {
  const [modulos, setModulos]     = useState<Modulo[]>([])
  const [loading, setLoading]     = useState(true)
  const [analizando, setAnalizando] = useState<string | null>(null)
  const [apiKey, setApiKey]       = useState('')
  const isMobile = useIsMobile()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [modulosRes, cfgRes] = await Promise.all([
        fetch('/api/modulos').then(r => r.json()),
        fetch('/api/configuracion').then(r => r.json()),
      ])
      setModulos(modulosRes)
      if (cfgRes?.anthropic_api_key) setApiKey(cfgRes.anthropic_api_key)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAnalizar = async (modulo: Modulo) => {
    setAnalizando(modulo.id)
    try {
      let notas: string
      if (apiKey) {
        const res  = await fetch('/api/analisis-ia', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: modulo.nombre, descripcion: modulo.descripcion, tipoTarea: modulo.tipoTarea,
            complejidad: modulo.complejidad, horasEstimadas: modulo.horasEstimadas, apiKey }) })
        const data = await res.json()
        notas = data.analisis || 'Sin análisis'
      } else {
        const { alerta, mensaje } = detectarAlertaHoras(modulo.horasEstimadas, modulo.complejidad)
        const rango = HORAS_ESPERADAS[modulo.complejidad]
        notas = alerta
          ? `⚠️ ${mensaje}. Rango esperado: ${rango.min}-${rango.max}h.`
          : `✅ ${modulo.horasEstimadas}h dentro del rango esperado (${rango.min}-${rango.max}h) para ${COMPLEJIDAD_LABELS[modulo.complejidad]}.`
      }
      await fetch(`/api/modulos/${modulo.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notasIA: notas }) })
      setModulos(prev => prev.map(m => m.id === modulo.id ? { ...m, notasIA: notas } : m))
    } finally { setAnalizando(null) }
  }

  const pad = isMobile ? '16px' : '24px 32px'
  const modulosConAlerta  = modulos.filter(m => m.alertaHoras)
  const modulosSinAlerta  = modulos.filter(m => !m.alertaHoras)

  return (
    <div>
      <PageHeader title="Análisis IA" subtitle="Verifica si las horas reportadas son razonables" onRefresh={fetchData} />
      <div style={{ padding: pad }}>
        {loading ? (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>Cargando...</div>
        ) : modulos.length === 0 ? (
          <div style={{ backgroundColor: '#3b82f610', border: '1px solid #3b82f630', borderRadius: '8px', padding: '14px 18px', color: '#60a5fa', fontSize: '14px' }}>
            No hay módulos para analizar.
          </div>
        ) : (
          <>
            {!apiKey && (
              <div style={{ backgroundColor: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#f59e0b' }}>
                💡 Sin API key — usando análisis local por rangos de horas.
              </div>
            )}
            {modulosConAlerta.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={13} /> Con alertas ({modulosConAlerta.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {modulosConAlerta.map(m => <ModuloCard key={m.id} modulo={m} onAnalizar={handleAnalizar} analizando={analizando === m.id} isMobile={isMobile} />)}
                </div>
              </div>
            )}
            {modulosSinAlerta.length > 0 && (
              <div>
                <h3 style={{ fontSize: '12px', color: '#10b981', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={13} /> Sin alertas ({modulosSinAlerta.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {modulosSinAlerta.map(m => <ModuloCard key={m.id} modulo={m} onAnalizar={handleAnalizar} analizando={analizando === m.id} isMobile={isMobile} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ModuloCard({ modulo, onAnalizar, analizando, isMobile }: {
  modulo: Modulo; onAnalizar: (m: Modulo) => void; analizando: boolean; isMobile: boolean
}) {
  const rango = HORAS_ESPERADAS[modulo.complejidad]
  return (
    <div style={{ backgroundColor: '#1a1a24', border: `1px solid ${modulo.alertaHoras ? '#f59e0b30' : '#2a2a3a'}`, borderRadius: '8px', padding: isMobile ? '12px' : '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0' }}>{modulo.nombre}</span>
            {modulo.alertaHoras ? <AlertTriangle size={12} color="#f59e0b" /> : <CheckCircle size={12} color="#10b981" />}
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>
            {modulo.colaborador.nombre.split(' ')[0]} · {modulo.proyecto.nombre} · {COMPLEJIDAD_LABELS[modulo.complejidad]} · {modulo.horasEstimadas}h
            {rango && <span style={{ color: '#4b5563' }}> (esperado {rango.min}-{rango.max}h)</span>}
          </div>
          {modulo.notasIA && (
            <div style={{ backgroundColor: '#7c3aed10', border: '1px solid #7c3aed30', borderRadius: '4px', padding: '6px 10px', fontSize: '12px', color: '#c4b5fd', marginTop: '8px' }}>
              <Sparkles size={10} style={{ display: 'inline', marginRight: '4px' }} />{modulo.notasIA}
            </div>
          )}
        </div>
        <button onClick={() => onAnalizar(modulo)} disabled={analizando}
          style={{ backgroundColor: '#7c3aed20', border: '1px solid #7c3aed40', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <Sparkles size={12} /> {analizando ? '...' : 'Analizar'}
        </button>
      </div>
    </div>
  )
}
