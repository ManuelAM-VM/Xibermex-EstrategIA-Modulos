'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import { AlertTriangle, CheckCircle, Clock, PlusCircle, List, CreditCard, CheckSquare, ArrowRight, TrendingUp } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ESTADO_LABELS } from '@/lib/utils'

interface ColaboradorStats {
  id: string; nombre: string; email: string | null
  totalModulos: number; modulosActivos: number; completados: number
  porCobrar: number; totalPagado: number; totalGenerado: number
}

interface ProyectoStats {
  id: string; nombre: string
  totalModulos: number; activos: number; completos: number
  totalFacturado: number; totalPagado: number; pendienteCobro: number
}

interface EstadoDist {
  estado: string; label: string; count: number; color: string
}

interface ModuloReciente {
  id: string; nombre: string; estado: string; montoTotal: number | null
  horasEstimadas: number; createdAt: string
  colaborador: { nombre: string }; proyecto: { nombre: string }
}

interface AlertaModulo {
  id: string; nombre: string; horasEstimadas: number; complejidad: string
  colaborador: { nombre: string }; proyecto: { nombre: string }
}

interface DashboardData {
  totalModulos: number; pendientes: number; enCurso: number
  entregados: number; aprobados: number; rechazados: number
  totalFacturado: number; totalCobrado: number
  totalPendiente: number; totalPorPagar: number
  statsColaboradores: ColaboradorStats[]
  statsProyectos: ProyectoStats[]
  distribucionEstados: EstadoDist[]
  alertasHoras: AlertaModulo[]
  modulosRecientes: ModuloReciente[]
}

const ESTADO_COLORS: Record<string, string> = {
  PENDIENTE: '#f59e0b', EN_CURSO: '#3b82f6',
  ENTREGADO: '#10b981', APROBADO: '#059669', RECHAZADO: '#ef4444',
}

// ── Componentes pequeños ─────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode
}) {
  return (
    <div style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '10px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <p style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        {icon && <span style={{ color: color || '#6b7280', opacity: 0.7 }}>{icon}</span>}
      </div>
      <p style={{ fontSize: '26px', fontWeight: '700', color: color || '#e2e8f0', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{sub}</p>}
    </div>
  )
}

function ProgressBar({ value, max, color = '#7c3aed', height = 6 }: {
  value: number; max: number; color?: string; height?: number
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ height, backgroundColor: '#2a2a3a', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: height, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', fontWeight: '600' }}>
      {children}
    </h3>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData]     = useState<DashboardData | null>(null)
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

  const pad = isMobile ? '16px' : '24px 32px'

  if (loading) return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general del equipo" onRefresh={fetchData} />
      <div style={{ padding: pad, color: '#6b7280', textAlign: 'center', paddingTop: '60px' }}>Cargando...</div>
    </div>
  )

  if (!data) return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general del equipo" onRefresh={fetchData} />
      <div style={{ padding: pad, color: '#ef4444', textAlign: 'center', paddingTop: '60px' }}>
        Error al cargar datos. Verifica la conexión a la base de datos.
      </div>
    </div>
  )

  const cobradoPct = data.totalFacturado > 0 ? (data.totalCobrado / data.totalFacturado) * 100 : 0

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general del equipo" onRefresh={fetchData} />
      <div style={{ padding: pad, display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ── Acciones rápidas ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { href: '/panel/registrar', label: 'Nuevo módulo',    icon: <PlusCircle  size={16} />, color: '#7c3aed', bg: '#7c3aed20' },
            { href: '/panel/aprobar',   label: `Aprobar (${data.pendientes})`, icon: <CheckSquare size={16} />, color: '#f59e0b', bg: '#f59e0b15' },
            { href: '/panel/modulos',   label: 'Ver módulos',     icon: <List        size={16} />, color: '#3b82f6', bg: '#3b82f615' },
            { href: '/panel/pagos',     label: 'Gestionar pagos', icon: <CreditCard  size={16} />, color: '#10b981', bg: '#10b98115' },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{
              backgroundColor: a.bg, border: `1px solid ${a.color}30`,
              borderRadius: '8px', padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: '8px',
              textDecoration: 'none', color: a.color, fontSize: '13px', fontWeight: '500',
              transition: 'opacity 0.15s',
            }}>
              {a.icon} {a.label}
            </Link>
          ))}
        </div>

        {/* ── Stats principales ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '12px' }}>
          <StatCard label="Total módulos"  value={data.totalModulos}  icon={<List size={14} />} />
          <StatCard label="En curso"       value={data.enCurso}       color="#3b82f6" icon={<Clock size={14} />} sub={`${data.pendientes} pendientes`} />
          <StatCard label="Completados"    value={data.aprobados + data.entregados} color="#10b981" icon={<CheckCircle size={14} />} />
          <StatCard label="Por cobrar"     value={`$${data.totalPorPagar.toFixed(0)}`} color="#f59e0b" icon={<TrendingUp size={14} />} sub="módulos aprobados" />
        </div>

        {/* ── Resumen financiero ── */}
        <div style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '10px', padding: '18px' }}>
          <SectionTitle>Resumen financiero</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Total facturado</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#e2e8f0' }}>${data.totalFacturado.toFixed(0)}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Cobrado</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>${data.totalCobrado.toFixed(0)}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Pendiente</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>${data.totalPendiente.toFixed(0)}</p>
            </div>
          </div>
          <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
            <span>Progreso de cobro</span>
            <span style={{ color: '#10b981' }}>{cobradoPct.toFixed(0)}%</span>
          </div>
          <ProgressBar value={data.totalCobrado} max={data.totalFacturado} color="#10b981" height={8} />
        </div>

        {/* ── Distribución por estado + Proyectos ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>

          {/* Distribución por estado */}
          <div style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '10px', padding: '18px' }}>
            <SectionTitle>Estado de módulos</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.distribucionEstados.filter(e => e.count > 0).map(e => (
                <div key={e.estado}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', color: e.color }}>{e.label}</span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{e.count} / {data.totalModulos}</span>
                  </div>
                  <ProgressBar value={e.count} max={data.totalModulos} color={e.color} height={5} />
                </div>
              ))}
              {data.totalModulos === 0 && (
                <p style={{ fontSize: '13px', color: '#4b5563', textAlign: 'center', padding: '12px 0' }}>Sin módulos aún</p>
              )}
            </div>
          </div>

          {/* Por proyecto */}
          <div style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '10px', padding: '18px' }}>
            <SectionTitle>Por proyecto</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.statsProyectos.map(p => (
                <div key={p.id} style={{ backgroundColor: '#13131a', borderRadius: '6px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{p.nombre}</span>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{p.totalModulos} módulos</span>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '11px' }}>
                    <span style={{ color: '#3b82f6' }}>{p.activos} activos</span>
                    <span style={{ color: '#10b981' }}>{p.completos} completos</span>
                    <span style={{ color: '#f59e0b', marginLeft: 'auto' }}>${p.pendienteCobro.toFixed(0)} pendiente</span>
                  </div>
                  <ProgressBar value={p.totalPagado} max={p.totalFacturado} color="#7c3aed" height={4} />
                </div>
              ))}
              {data.statsProyectos.length === 0 && (
                <p style={{ fontSize: '13px', color: '#4b5563', textAlign: 'center', padding: '12px 0' }}>Sin proyectos</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Colaboradores ── */}
        <div style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '10px', padding: '18px' }}>
          <SectionTitle>Colaboradores</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '12px' }}>
            {data.statsColaboradores.map(col => (
              <div key={col.id} style={{ backgroundColor: '#13131a', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#7c3aed30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#a78bfa', flexShrink: 0 }}>
                    {col.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{col.nombre}</p>
                    <p style={{ fontSize: '11px', color: '#6b7280' }}>{col.totalModulos} módulos · {col.completados} completados</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: '#3b82f6' }}>{col.modulosActivos}</p>
                    <p style={{ fontSize: '10px', color: '#6b7280' }}>Activos</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: '#f59e0b' }}>${col.porCobrar.toFixed(0)}</p>
                    <p style={{ fontSize: '10px', color: '#6b7280' }}>Por cobrar</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', fontWeight: '700', color: '#10b981' }}>${col.totalPagado.toFixed(0)}</p>
                    <p style={{ fontSize: '10px', color: '#6b7280' }}>Cobrado</p>
                  </div>
                </div>
                <ProgressBar value={col.totalPagado} max={col.totalGenerado} color="#10b981" height={4} />
                <p style={{ fontSize: '10px', color: '#4b5563', marginTop: '4px', textAlign: 'right' }}>
                  {col.totalGenerado > 0 ? ((col.totalPagado / col.totalGenerado) * 100).toFixed(0) : 0}% cobrado de ${col.totalGenerado.toFixed(0)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Módulos recientes ── */}
        {data.modulosRecientes.length > 0 && (
          <div style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '10px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <SectionTitle>Módulos recientes</SectionTitle>
              <Link href="/panel/modulos" style={{ fontSize: '12px', color: '#7c3aed', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.modulosRecientes.map(m => {
                const color = ESTADO_COLORS[m.estado] || '#6b7280'
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', backgroundColor: '#13131a', borderRadius: '6px',
                    flexWrap: isMobile ? 'wrap' : 'nowrap',
                  }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.nombre}
                      </p>
                      <p style={{ fontSize: '11px', color: '#6b7280' }}>
                        {m.colaborador.nombre.split(' ')[0]} · {m.proyecto.nombre} · {m.horasEstimadas}h
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', backgroundColor: `${color}20`, color, padding: '2px 8px', borderRadius: '4px' }}>
                        {ESTADO_LABELS[m.estado] ?? m.estado}
                      </span>
                      {m.montoTotal != null && (
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>${m.montoTotal.toFixed(0)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Alertas de horas ── */}
        <div style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '10px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <AlertTriangle size={14} color="#f59e0b" />
            <SectionTitle>Alertas de horas</SectionTitle>
          </div>
          {data.alertasHoras.length === 0 ? (
            <div style={{ backgroundColor: '#10b98115', border: '1px solid #10b98130', borderRadius: '6px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={13} color="#10b981" />
              <span style={{ color: '#10b981', fontSize: '13px' }}>Sin alertas — todo dentro del rango esperado.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.alertasHoras.map(m => (
                <div key={m.id} style={{
                  backgroundColor: '#f59e0b10', border: '1px solid #f59e0b30',
                  borderRadius: '6px', padding: '10px 14px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexWrap: 'wrap', gap: '6px',
                }}>
                  <div>
                    <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: '500' }}>{m.nombre}</span>
                    <span style={{ color: '#6b7280', fontSize: '12px', marginLeft: '8px' }}>
                      {m.colaborador.nombre.split(' ')[0]} · {m.proyecto.nombre}
                    </span>
                  </div>
                  <span style={{ color: '#f59e0b', fontSize: '12px' }}>{m.horasEstimadas}h · {m.complejidad}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
