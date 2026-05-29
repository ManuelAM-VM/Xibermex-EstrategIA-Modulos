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
        include: {
          modulos: {
            include: { pagos: true },
          },
        },
      }),
      prisma.modulo.findMany({
        where: { alertaHoras: true },
        include: { colaborador: true, proyecto: true },
      }),
    ])

    // Calcular por pagar (módulos aprobados no pagados completamente)
    const modulosPorPagar = await prisma.modulo.findMany({
      where: {
        estado: { in: ['APROBADO', 'ENTREGADO'] },
        pagado: false,
      },
    })

    const totalPorPagar = modulosPorPagar.reduce((acc, m) => {
      const pendiente = (m.montoTotal || 0) - m.montoPagado
      return acc + pendiente
    }, 0)

    // Stats por colaborador
    const statsColaboradores = colaboradores.map((col) => {
      const modulosActivos = col.modulos.filter((m) =>
        ['PENDIENTE', 'EN_CURSO'].includes(m.estado)
      ).length
      const porCobrar = col.modulos.reduce((acc, m) => {
        if (!m.pagado) {
          return acc + ((m.montoTotal || 0) - m.montoPagado)
        }
        return acc
      }, 0)
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
