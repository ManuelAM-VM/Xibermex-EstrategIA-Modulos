'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import { AlertTriangle, CheckCircle, PlusCircle, List, CreditCard, CheckSquare, ArrowRight, Clock } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ESTADO_LABELS } from '@/lib/utils'

interface ColaboradorStats {
  id: string; nombre: string
  totalModulos: number; modulosActivos: number
  porCobrar: number; totalPagado: number; totalGenerado: number
}

interface ProyectoStats {
  id: string; nombre: string
  totalModulos: number; activos: number; completos: number
  totalFacturado: number; totalPagado: number; pendienteCobro: number
}

interface EstadoDist { estado: string; label: string; count: number; color: string }

interface ModuloReciente {
  id: string; nombre: string; estado: string; montoTotal: number | null
  horasEstimadas: number; colaborador: { nombre: string }; proyecto: { nombre: string }
}

interface AlertaModulo {
  id: string; nombre: string; horasEstimadas: number; complejidad: string
  colaborador: { nombre: string }; proyecto: { nombre: string }
}

interface DashboardData {
  totalModulos: number; pendientes: number; enCurso: number
  aprobados: number; entregados: number; rechazados: number
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

function Bar({ value, max, color = '#7c3aed' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div style={{ height: 5, backgroundColor: '#2a2a3a', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: 3, transition: 'width 0.4s' }} />
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '10px', padding: '16px', ...style }}>
      {children}
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', fontWeight: '600' }}>{children}</p>
}

export default function DashboardPage() {
  const [data, setData]       = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const isMobile = useIsMobile()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try { setData(await fetch('/api/dashboard').then(r => r.json())) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const pad = isMobile ? '14px' : '24px 32px'

  if (loading) return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general" onRefresh={fetchData} />
      <div style={{ padding: pad, color: '#6b7280', textAlign: 'center', paddingTop: '60px' }}>Cargando...</div>
    </div>
  )

  if (!data || (data as { error?: string }).error) return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general" onRefresh={fetchData} />
      <div style={{ padding: pad, color: '#ef4444', textAlign: 'center', paddingTop: '60px' }}>
        Error al cargar. Verifica la conexión a la base de datos.
      </div>
    </div>
  )

  const cobradoPct = data.totalFacturado > 0 ? (data.totalCobrado / data.totalFacturado) * 100 : 0

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general" onRefresh={fetchData} />
      <div style={{ padding: pad, display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Acciones rápidas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {[
            { href: '/panel/registrar', label: 'Nuevo módulo',    icon: <PlusCircle  size={15} />, color: '#7c3aed' },
            { href: '/panel/aprobar',   label: `Aprobar ${data.pendientes > 0 ? `(${data.pendientes})` : ''}`, icon: <CheckSquare size={15} />, color: '#f59e0b' },
            { href: '/panel/modulos',   label: 'Módulos',         icon: <List        size={15} />, color: '#3b82f6' },
            { href: '/panel/pagos',     label: 'Pagos',           icon: <CreditCard  size={15} />, color: '#10b981' },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{
              backgroundColor: `${a.color}15`, border: `1px solid ${a.color}30`,
              borderRadius: '8px', padding: '12px',
              display: 'flex', alignItems: 'center', gap: '8px',
              textDecoration: 'none', color: a.color,
              fontSize: isMobile ? '13px' : '14px', fontWeight: '500',
            }}>
              {a.icon} {a.label}
            </Link>
          ))}
        </div>

        {/* Stats 2×2 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
          {[
            { label: 'Total módulos', value: data.totalModulos,                    color: '#e2e8f0', sub: `${data.enCurso} en curso` },
            { label: 'Pendientes',    value: data.pendientes,                      color: '#f59e0b', sub: 'requieren aprobación' },
            { label: 'Completados',   value: data.aprobados + data.entregados,     color: '#10b981', sub: 'aprobados + entregados' },
            { label: 'Por cobrar',    value: `$${data.totalPorPagar.toFixed(0)}`,  color: '#f59e0b', sub: 'módulos aprobados' },
          ].map(s => (
            <Card key={s.label}>
              <p style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{s.label}</p>
              <p style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: '10px', color: '#4b5563', marginTop: '4px' }}>{s.sub}</p>
            </Card>
          ))}
        </div>

        {/* Financiero */}
        <Card>
          <Label>Financiero</Label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px' }}>Facturado</p>
              <p style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: '700', color: '#e2e8f0' }}>${data.totalFacturado.toFixed(0)}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px' }}>Cobrado</p>
              <p style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: '700', color: '#10b981' }}>${data.totalCobrado.toFixed(0)}</p>
            </div>
            <div>
              <p style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px' }}>Pendiente</p>
              <p style={{ fontSize: isMobile ? '15px' : '18px', fontWeight: '700', color: '#f59e0b' }}>${data.totalPendiente.toFixed(0)}</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280', marginBottom: '4px' }}>
            <span>Cobro</span><span style={{ color: '#10b981' }}>{cobradoPct.toFixed(0)}%</span>
          </div>
          <Bar value={data.totalCobrado} max={data.totalFacturado} color="#10b981" />
        </Card>

        {/* Colaboradores */}
        <div>
          <Label>Colaboradores</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.statsColaboradores.map(col => (
              <Card key={col.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#7c3aed25', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#a78bfa', flexShrink: 0 }}>
                    {col.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.nombre}</p>
                    <p style={{ fontSize: '11px', color: '#6b7280' }}>{col.totalModulos} módulos · {col.modulosActivos} activos</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ backgroundColor: '#f59e0b10', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#f59e0b' }}>${col.porCobrar.toFixed(0)}</p>
                    <p style={{ fontSize: '10px', color: '#6b7280' }}>Por cobrar</p>
                  </div>
                  <div style={{ backgroundColor: '#10b98110', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                    <p style={{ fontSize: '14px', fontWeight: '700', color: '#10b981' }}>${col.totalPagado.toFixed(0)}</p>
                    <p style={{ fontSize: '10px', color: '#6b7280' }}>Cobrado</p>
                  </div>
                </div>
                <Bar value={col.totalPagado} max={col.totalGenerado} color="#10b981" />
                <p style={{ fontSize: '10px', color: '#4b5563', marginTop: '3px', textAlign: 'right' }}>
                  {col.totalGenerado > 0 ? ((col.totalPagado / col.totalGenerado) * 100).toFixed(0) : 0}% de ${col.totalGenerado.toFixed(0)}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* Proyectos */}
        {data.statsProyectos.length > 0 && (
          <div>
            <Label>Proyectos</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.statsProyectos.map(p => (
                <Card key={p.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{p.nombre}</p>
                    <p style={{ fontSize: '11px', color: '#6b7280' }}>{p.totalModulos} módulos</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', marginBottom: '8px' }}>
                    <span style={{ color: '#3b82f6' }}>{p.activos} activos</span>
                    <span style={{ color: '#10b981' }}>{p.completos} completos</span>
                    <span style={{ color: '#f59e0b', marginLeft: 'auto' }}>${p.pendienteCobro.toFixed(0)} pendiente</span>
                  </div>
                  <Bar value={p.totalPagado} max={p.totalFacturado} color="#7c3aed" />
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Módulos recientes */}
        {data.modulosRecientes.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Label>Recientes</Label>
              <Link href="/panel/modulos" style={{ fontSize: '11px', color: '#7c3aed', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
                Ver todos <ArrowRight size={11} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.modulosRecientes.map(m => {
                const color = ESTADO_COLORS[m.estado] || '#6b7280'
                return (
                  <div key={m.id} style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a3a', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nombre}</p>
                      <p style={{ fontSize: '11px', color: '#6b7280' }}>
                        {m.colaborador.nombre.split(' ')[0]} · {m.proyecto.nombre}
                        {' · '}<Clock size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {m.horasEstimadas}h
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                      <span style={{ fontSize: '10px', backgroundColor: `${color}20`, color, padding: '2px 7px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                        {ESTADO_LABELS[m.estado] ?? m.estado}
                      </span>
                      {m.montoTotal != null && (
                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>${m.montoTotal.toFixed(0)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Alertas */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <AlertTriangle size={13} color="#f59e0b" />
            <Label>Alertas de horas</Label>
          </div>
          {data.alertasHoras.length === 0 ? (
            <div style={{ backgroundColor: '#10b98112', border: '1px solid #10b98130', borderRadius: '8px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={13} color="#10b981" />
              <span style={{ color: '#10b981', fontSize: '13px' }}>Sin alertas — todo en rango.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {data.alertasHoras.map(m => (
                <div key={m.id} style={{ backgroundColor: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: '8px', padding: '10px 12px' }}>
                  <p style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500', marginBottom: '2px' }}>{m.nombre}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#6b7280' }}>{m.colaborador.nombre.split(' ')[0]} · {m.proyecto.nombre}</span>
                    <span style={{ color: '#f59e0b' }}>{m.horasEstimadas}h · {m.complejidad}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
