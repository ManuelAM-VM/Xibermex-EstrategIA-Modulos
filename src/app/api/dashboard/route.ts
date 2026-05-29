import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const [
      totalModulos,
      pendientes,
      entregados,
      colaboradores,
      modulosConAlerta,
    ] = await Promise.all([
      prisma.modulo.count(),
      prisma.modulo.count({ where: { estado: 'PENDIENTE' } }),
      prisma.modulo.count({ where: { estado: { in: ['ENTREGADO', 'APROBADO'] } } }),
      prisma.colaborador.findMany({
        where: { activo: true },
        include: { modulos: { include: { pagos: true } } },
      }),
      prisma.modulo.findMany({
        where: { alertaHoras: true },
        include: { colaborador: true, proyecto: true },
      }),
    ])

    // "Por cobrar" = cualquier módulo con monto y que no esté pagado completamente
    // Sin importar el estado — si tiene monto asignado, se debe cobrar
    const esPorCobrar = (m: { montoTotal: number | null; montoPagado: number; pagado: boolean }) =>
      !m.pagado && (m.montoTotal ?? 0) > 0

    const totalPorPagar = colaboradores.reduce((total, col) => {
      return total + col.modulos
        .filter(esPorCobrar)
        .reduce((acc, m) => acc + ((m.montoTotal || 0) - m.montoPagado), 0)
    }, 0)

    // Stats por colaborador
    const statsColaboradores = colaboradores.map((col) => {
      const modulosActivos = col.modulos.filter(m =>
        ['PENDIENTE', 'EN_CURSO'].includes(m.estado)
      ).length

      const porCobrar = col.modulos
        .filter(esPorCobrar)
        .reduce((acc, m) => acc + ((m.montoTotal || 0) - m.montoPagado), 0)

      const totalPagado = col.modulos.reduce((acc, m) => acc + m.montoPagado, 0)

      return {
        id: col.id,
        nombre: col.nombre,
        email: col.email,
        totalModulos: col.modulos.length,
        modulosActivos,
        porCobrar,
        totalPagado,
      }
    })

    return NextResponse.json({
      totalModulos,
      pendientes,
      entregados,
      totalPorPagar,
      statsColaboradores,
      alertasHoras: modulosConAlerta,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Error al obtener datos del dashboard' }, { status: 500 })
  }
}
