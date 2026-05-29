'use client'

import { useState, useEffect, useCallback } from 'react'
import PageHeader from '@/components/PageHeader'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'

interface ColaboradorStats {
  id: string
  nombre: string
  email: string | null
  totalModulos: number
  modulosActivos: number
  porCobrar: number
  totalPagado: number
}

interface AlertaModulo {
  id: string
  nombre: string
  horasEstimadas: number
  complejidad: string
  colaborador: { nombre: string }
  proyecto: { nombre: string }
}

interface DashboardData {
  totalModulos: number
  pendientes: number
  entregados: number
  totalPorPagar: number
  statsColaboradores: ColaboradorStats[]
  alertasHoras: AlertaModulo[]
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div style={{
      backgroundColor: '#1a1a24', border: '1px solid #2a2a3a',
      borderRadius: '10px', padding: '18px 20px',
    }}>
      <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
        {label}
      </p>
      <p style={{ fontSize: '28px', fontWeight: '700', color: color || '#e2e8f0', lineHeight: 1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: '11px', color: '#4b5563', marginTop: '5px' }}>{sub}</p>}
    </div>
  )
}

// ── Colaborador card ─────────────────────────────────────────────────────────
function ColaboradorCard({ stats }: { stats: ColaboradorStats }) {
  return (
    <div style={{
      backgroundColor: '#1a1a24', border: '1px solid #2a2a3a',
      borderRadius: '10px', padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '14px' }}>{stats.nombre}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Row label="Módulos"      value={stats.totalModulos} />
        <Row label="En curso"     value={stats.modulosActivos} />
        <Row label="Por cobrar"   value={`$${stats.porCobrar.toFixed(0)}`}  valueColor="#f59e0b" />
        <Row label="Total pagado" value={`$${stats.totalPagado.toFixed(0)}`} valueColor="#10b981" />
      </div>
    </div>
  )
}

function Row({ label, value, valueColor }: {
  label: string; value: string | number; valueColor?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '13px', color: '#9ca3af' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: '600', color: valueColor || '#e2e8f0' }}>{value}</span>
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/dashboard')
      const json = await res.json()
      setData(json)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const pad = isMobile ? '14px' : '24px 32px'

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general del equipo" onRefresh={fetchData} />
      <div style={{ padding: pad }}>
        {loading ? (
          <div style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>Cargando...</div>
        ) : data ? (
          <>
            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
              gap: isMobile ? '10px' : '16px',
              marginBottom: isMobile ? '14px' : '24px',
            }}>
              <StatCard label="Total Módulos" value={data.totalModulos} />
              <StatCard label="Pendientes"    value={data.pendientes}   color="#f59e0b" sub="Requieren aprobación" />
              <StatCard label="Entregados"    value={data.entregados}   color="#10b981" />
              <StatCard label="Por Pagar"     value={`$${(data.totalPorPagar ?? 0).toFixed(0)}`} color="#f59e0b" />
            </div>

            {/* Colaboradores */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? '10px' : '16px',
              marginBottom: isMobile ? '14px' : '24px',
            }}>
              {data.statsColaboradores.map(col => (
                <ColaboradorCard key={col.id} stats={col} />
              ))}
            </div>

            {/* Alertas de horas */}
            <div style={{
              backgroundColor: '#1a1a24', border: '1px solid #2a2a3a',
              borderRadius: '10px', padding: isMobile ? '14px' : '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <AlertTriangle size={15} color="#f59e0b" />
                <span style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Alertas de Horas
                </span>
              </div>

              {data.alertasHoras.length === 0 ? (
                <div style={{
                  backgroundColor: '#10b98115', border: '1px solid #10b98130',
                  borderRadius: '6px', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <CheckCircle size={13} color="#10b981" />
                  <span style={{ color: '#10b981', fontSize: '13px' }}>
                    Sin alertas — todo dentro del rango esperado.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {data.alertasHoras.map(m => (
                    <div key={m.id} style={{
                      backgroundColor: '#f59e0b10', border: '1px solid #f59e0b30',
                      borderRadius: '6px', padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? '4px' : '0',
                    }}>
                      <div>
                        <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '500' }}>
                          {m.nombre}
                        </span>
                        <span style={{ color: '#6b7280', fontSize: '12px', marginLeft: isMobile ? '0' : '8px', display: isMobile ? 'block' : 'inline' }}>
                          {m.colaborador.nombre.split(' ')[0]} · {m.proyecto.nombre}
                        </span>
                      </div>
                      <span style={{ color: '#f59e0b', fontSize: '12px', flexShrink: 0 }}>
                        {m.horasEstimadas}h · {m.complejidad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ color: '#ef4444', textAlign: 'center', padding: '40px' }}>
            Error al cargar datos. Verifica la conexión a la base de datos.
          </div>
        )}
      </div>
    </div>
  )
}
