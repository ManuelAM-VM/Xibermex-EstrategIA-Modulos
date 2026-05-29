import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      totalModulos,
      pendientes,
      enCurso,
      entregados,
      aprobados,
      rechazados,
      colaboradores,
      modulosConAlerta,
      modulosRecientes,
      proyectos,
    ] = await Promise.all([
      prisma.modulo.count(),
      prisma.modulo.count({ where: { estado: 'PENDIENTE' } }),
      prisma.modulo.count({ where: { estado: 'EN_CURSO' } }),
      prisma.modulo.count({ where: { estado: 'ENTREGADO' } }),
      prisma.modulo.count({ where: { estado: 'APROBADO' } }),
      prisma.modulo.count({ where: { estado: 'RECHAZADO' } }),
      prisma.colaborador.findMany({
        where: { activo: true },
        include: { modulos: { include: { pagos: true } } },
      }),
      prisma.modulo.findMany({
        where: { alertaHoras: true },
        include: { colaborador: true, proyecto: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.modulo.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { colaborador: true, proyecto: true },
      }),
      prisma.proyecto.findMany({
        where: { activo: true },
        include: {
          modulos: true,
        },
      }),
    ])

    // Totales financieros globales
    const todosModulos = await prisma.modulo.findMany({
      select: { montoTotal: true, montoPagado: true, pagado: true, estado: true },
    })

    const totalFacturado  = todosModulos.reduce((a, m) => a + (m.montoTotal ?? 0), 0)
    const totalCobrado    = todosModulos.reduce((a, m) => a + m.montoPagado, 0)
    const totalPendiente  = totalFacturado - totalCobrado
    const totalPorPagar   = todosModulos
      .filter(m => ['APROBADO', 'ENTREGADO'].includes(m.estado) && !m.pagado)
      .reduce((a, m) => a + ((m.montoTotal ?? 0) - m.montoPagado), 0)

    // Stats por colaborador
    const statsColaboradores = colaboradores.map((col) => {
      const modulosActivos = col.modulos.filter(m => ['PENDIENTE', 'EN_CURSO'].includes(m.estado)).length
      const porCobrar      = col.modulos.reduce((a, m) => !m.pagado ? a + ((m.montoTotal ?? 0) - m.montoPagado) : a, 0)
      const totalPagado    = col.modulos.reduce((a, m) => a + m.montoPagado, 0)
      const totalGenerado  = col.modulos.reduce((a, m) => a + (m.montoTotal ?? 0), 0)
      const completados    = col.modulos.filter(m => ['APROBADO', 'ENTREGADO'].includes(m.estado)).length

      return {
        id: col.id, nombre: col.nombre, email: col.email,
        totalModulos: col.modulos.length,
        modulosActivos, completados,
        porCobrar, totalPagado, totalGenerado,
      }
    })

    // Stats por proyecto
    const statsProyectos = proyectos.map(p => {
      const total     = p.modulos.reduce((a, m) => a + (m.montoTotal ?? 0), 0)
      const pagado    = p.modulos.reduce((a, m) => a + m.montoPagado, 0)
      const activos   = p.modulos.filter(m => ['PENDIENTE', 'EN_CURSO'].includes(m.estado)).length
      const completos = p.modulos.filter(m => ['APROBADO', 'ENTREGADO'].includes(m.estado)).length
      return {
        id: p.id, nombre: p.nombre,
        totalModulos: p.modulos.length,
        activos, completos,
        totalFacturado: total,
        totalPagado: pagado,
        pendienteCobro: total - pagado,
      }
    })

    // Distribución por estado
    const distribucionEstados = [
      { estado: 'PENDIENTE',  label: 'Pendiente',  count: pendientes,  color: '#f59e0b' },
      { estado: 'EN_CURSO',   label: 'En curso',   count: enCurso,     color: '#3b82f6' },
      { estado: 'ENTREGADO',  label: 'Entregado',  count: entregados,  color: '#10b981' },
      { estado: 'APROBADO',   label: 'Aprobado',   count: aprobados,   color: '#059669' },
      { estado: 'RECHAZADO',  label: 'Rechazado',  count: rechazados,  color: '#ef4444' },
    ]

    return NextResponse.json({
      // Conteos
      totalModulos, pendientes, enCurso, entregados, aprobados, rechazados,
      // Financiero
      totalFacturado, totalCobrado, totalPendiente, totalPorPagar,
      // Detalle
      statsColaboradores,
      statsProyectos,
      distribucionEstados,
      alertasHoras: modulosConAlerta,
      modulosRecientes,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Error al obtener datos del dashboard' }, { status: 500 })
  }
}
