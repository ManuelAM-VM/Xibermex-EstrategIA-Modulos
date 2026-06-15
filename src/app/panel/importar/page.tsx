'use client'

import { useState, useRef, useCallback } from 'react'
import PageHeader from '@/components/PageHeader'
import { Upload, AlertTriangle, CheckCircle, FileSpreadsheet, X, Info } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface ResultadoImport {
  success: boolean; importados?: number; omitidos?: number; errores?: number
  mensaje?: string; error?: string
  detalle?: { creados: string[]; omitidos: string[]; errores: string[] }
}

export default function ImportarPage() {
  const isMobile = useIsMobile()
  const [importandoEjemplo, setImportandoEjemplo] = useState(false)
  const [importandoExcel, setImportandoExcel]     = useState(false)
  const [resultado, setResultado]                 = useState<ResultadoImport | null>(null)
  const [archivo, setArchivo]                     = useState<File | null>(null)
  const [dragging, setDragging]                   = useState(false)
  const [mostrarDetalle, setMostrarDetalle]       = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportarEjemplo = async () => {
    if (!confirm('¿Importar módulos de ejemplo? Solo si la lista está vacía.')) return
    setImportandoEjemplo(true); setResultado(null)
    try {
      const res  = await fetch('/api/importar', { method: 'POST' })
      setResultado(await res.json())
    } catch { setResultado({ success: false, error: 'Error de conexión' }) }
    finally  { setImportandoEjemplo(false) }
  }

  const handleArchivoChange = (file: File | null) => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx','xls'].includes(ext || '')) { setResultado({ success: false, error: 'Solo .xlsx o .xls' }); return }
    setArchivo(file); setResultado(null); setMostrarDetalle(false)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    handleArchivoChange(e.dataTransfer.files[0])
  }, [])

  const handleImportarExcel = async () => {
    if (!archivo) return
    setImportandoExcel(true); setResultado(null); setMostrarDetalle(false)
    try {
      const fd = new FormData(); fd.append('file', archivo)
      const res = await fetch('/api/importar/excel', { method: 'POST', body: fd })
      setResultado(await res.json())
    } catch { setResultado({ success: false, error: 'Error de conexión' }) }
    finally  { setImportandoExcel(false) }
  }

  const limpiar = () => { setArchivo(null); setResultado(null); setMostrarDetalle(false); if (fileInputRef.current) fileInputRef.current.value = '' }

  const pad = isMobile ? '16px' : '24px 32px'

  return (
    <div>
      <PageHeader title="Importar datos" subtitle="Carga módulos desde un archivo Excel (.xlsx)" />
      <div style={{ padding: pad, display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: isMobile ? '100%' : '640px' }}>

        {/* Excel */}
        <div style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '10px', padding: isMobile ? '16px' : '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <FileSpreadsheet size={15} color="#10b981" />
            <span style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '13px' }}>IMPORTAR DESDE EXCEL</span>
          </div>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '14px', lineHeight: '1.6' }}>
            Sube tu archivo <strong style={{ color: '#e2e8f0' }}>.xlsx</strong> con columnas: MODULO, PROYECTO, COLABORADOR, TIPO DE TAREA, COMPLEJIDAD, HORAS ESTIMADAS, ESTATUS.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#7c3aed' : archivo ? '#10b981' : '#2a2a3a'}`,
              borderRadius: '8px', padding: isMobile ? '20px 16px' : '24px',
              textAlign: 'center', cursor: 'pointer',
              backgroundColor: dragging ? '#7c3aed08' : archivo ? '#10b98108' : 'transparent',
              transition: 'all 0.2s', marginBottom: '14px',
            }}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => handleArchivoChange(e.target.files?.[0] || null)} />
            {archivo ? (
              <div>
                <FileSpreadsheet size={24} color="#10b981" style={{ margin: '0 auto 6px' }} />
                <p style={{ color: '#10b981', fontWeight: '600', fontSize: '13px' }}>{archivo.name}</p>
                <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>{(archivo.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <Upload size={24} color="#4b5563" style={{ margin: '0 auto 6px' }} />
                <p style={{ color: '#9ca3af', fontSize: '13px' }}>
                  {isMobile ? 'Toca para seleccionar' : 'Arrastra o haz clic para seleccionar'}
                </p>
                <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '2px' }}>.xlsx o .xls</p>
              </div>
            )}
          </div>

          {/* Resultado */}
          {resultado && (
            <div style={{
              backgroundColor: resultado.success ? '#10b98112' : '#ef444412',
              border: `1px solid ${resultado.success ? '#10b98130' : '#ef444430'}`,
              borderRadius: '8px', padding: '12px 14px', marginBottom: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: resultado.detalle ? '6px' : '0' }}>
                {resultado.success ? <CheckCircle size={14} color="#10b981" /> : <AlertTriangle size={14} color="#f87171" />}
                <span style={{ fontSize: '13px', color: resultado.success ? '#34d399' : '#f87171', fontWeight: '500' }}>
                  {resultado.success ? resultado.mensaje : resultado.error}
                </span>
              </div>
              {resultado.success && resultado.detalle && (
                <>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '12px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#10b981' }}>✓ {resultado.importados} importados</span>
                    {(resultado.omitidos || 0) > 0 && <span style={{ color: '#f59e0b' }}>⚠ {resultado.omitidos} omitidos</span>}
                    {(resultado.errores  || 0) > 0 && <span style={{ color: '#f87171' }}>✗ {resultado.errores} errores</span>}
                  </div>
                  {(resultado.detalle.omitidos.length + resultado.detalle.errores.length) > 0 && (
                    <button onClick={() => setMostrarDetalle(!mostrarDetalle)}
                      style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', padding: '0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Info size={11} /> {mostrarDetalle ? 'Ocultar' : 'Ver detalle'}
                    </button>
                  )}
                  {mostrarDetalle && (
                    <div style={{ marginTop: '8px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {resultado.detalle.errores.map((e, i) => <div key={i} style={{ color: '#f87171' }}>✗ {e}</div>)}
                      {resultado.detalle.omitidos.map((o, i) => <div key={i} style={{ color: '#f59e0b' }}>⚠ {o}</div>)}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {archivo && (
              <button onClick={limpiar} style={{ backgroundColor: 'transparent', border: '1px solid #2a2a3a', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <X size={13} /> Limpiar
              </button>
            )}
            <button onClick={handleImportarExcel} disabled={!archivo || importandoExcel}
              style={{ backgroundColor: archivo ? '#10b981' : '#1a2a24', color: archivo ? 'white' : '#4b5563', display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
              <Upload size={13} /> {importandoExcel ? 'Importando...' : 'Importar Excel'}
            </button>
          </div>
        </div>

        {/* Columnas reconocidas */}
        <div style={{ backgroundColor: '#13131a', border: '1px solid #1e1e2e', borderRadius: '8px', padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <Info size={12} color="#6b7280" />
            <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Columnas reconocidas</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '4px 14px', fontSize: '11px' }}>
            {[['MODULO','Nombre'],['PROYECTO','EstrategIA / MarIA'],['COLABORADOR','Nombre del dev'],['TIPO DE TAREA','Desarrollo / Actualización...'],
              ['COMPLEJIDAD','Baja / Media / Alta'],['HORAS ESTIMADAS','Número o rango "4-6 hrs"'],['ESTATUS','Listo / En curso / Sin empezar']
            ].map(([col, desc]) => (
              <div key={col} style={{ display: 'flex', gap: '5px' }}>
                <span style={{ color: '#7c3aed', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{col}</span>
                <span style={{ color: '#4b5563' }}>— {desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ejemplo */}
        <div style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '10px', padding: isMobile ? '14px' : '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Upload size={13} color="#6b7280" />
            <span style={{ fontWeight: '600', color: '#6b7280', fontSize: '12px' }}>DATOS DE EJEMPLO</span>
          </div>
          <p style={{ fontSize: '12px', color: '#4b5563', marginBottom: '10px' }}>22 módulos predefinidos. Solo si la lista está vacía.</p>
          <div style={{ backgroundColor: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: '6px', padding: '8px 12px', marginBottom: '10px', fontSize: '12px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={12} />
            Verifica en <a href="/panel/modulos" style={{ color: '#f59e0b', fontWeight: '600', textDecoration: 'underline' }}>Módulos</a> que esté vacío.
          </div>
          <button onClick={handleImportarEjemplo} disabled={importandoEjemplo}
            style={{ backgroundColor: '#1e1e2e', border: '1px solid #2a2a3a', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <Upload size={12} /> {importandoEjemplo ? 'Importando...' : 'Importar 22 módulos de ejemplo'}
          </button>
        </div>

        {/* Recalcular precios */}
        <RecalcularSection isMobile={isMobile} />
      </div>
    </div>
  )
}

// ── Sección de recálculo de precios ──────────────────────────────────────────
function RecalcularSection({ isMobile }: { isMobile: boolean }) {
  const [recalculando, setRecalculando] = useState(false)
  const [resultado, setResultado] = useState<{ success: boolean; mensaje?: string; error?: string; actualizados?: number; tarifas?: { tarifaDia: number; horasDia: number; tarifaExtra: number } } | null>(null)
  const [desde, setDesde] = useState('2026-06-01')

  const handleRecalcular = async () => {
    if (!confirm(`¿Recalcular precios de todos los módulos desde ${desde} con las tarifas actuales ($350/día + $200/hr extra)?`)) return
    setRecalculando(true)
    setResultado(null)
    try {
      const res = await fetch('/api/recalcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desde }),
      })
      setResultado(await res.json())
    } catch {
      setResultado({ success: false, error: 'Error de conexión' })
    } finally {
      setRecalculando(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#1a1a24', border: '1px solid #7c3aed30', borderRadius: '10px', padding: isMobile ? '14px' : '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontWeight: '600', color: '#a78bfa', fontSize: '12px' }}>⚡ RECALCULAR PRECIOS</span>
      </div>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px', lineHeight: '1.5' }}>
        Recalcula el monto de todos los módulos desde la fecha indicada aplicando las tarifas actuales
        (<strong style={{ color: '#e2e8f0' }}>$350/día + $200/hr extra</strong>).
      </p>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <label style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
            Desde (fecha)
          </label>
          <input
            type="date"
            value={desde}
            onChange={e => setDesde(e.target.value)}
            style={{ fontSize: '13px', colorScheme: 'dark' }}
          />
        </div>
        <button
          onClick={handleRecalcular}
          disabled={recalculando}
          style={{
            backgroundColor: '#7c3aed', color: 'white',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', padding: '8px 16px',
          }}
        >
          {recalculando ? 'Recalculando...' : '⚡ Recalcular'}
        </button>
      </div>

      {resultado && (
        <div style={{
          backgroundColor: resultado.success ? '#10b98112' : '#ef444412',
          border: `1px solid ${resultado.success ? '#10b98130' : '#ef444430'}`,
          borderRadius: '8px', padding: '10px 14px', fontSize: '12px',
          color: resultado.success ? '#34d399' : '#f87171',
        }}>
          {resultado.success ? (
            <>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>✓ {resultado.mensaje}</div>
              {resultado.tarifas && (
                <div style={{ color: '#6b7280', fontSize: '11px' }}>
                  Tarifas usadas: ${resultado.tarifas.tarifaDia}/día ({resultado.tarifas.horasDia}h) + ${resultado.tarifas.tarifaExtra}/hr extra
                </div>
              )}
            </>
          ) : resultado.error}
        </div>
      )}
    </div>
  )
}
