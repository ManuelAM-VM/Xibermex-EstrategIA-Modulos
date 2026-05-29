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

    // "Por cobrar" = módulos APROBADO o ENTREGADO que no están pagados completamente
    // Mismo criterio para el stat global y para cada colaborador
    const ESTADOS_COBRABLES = ['APROBADO', 'ENTREGADO']

    const totalPorPagar = colaboradores.reduce((total, col) => {
      return total + col.modulos
        .filter(m => ESTADOS_COBRABLES.includes(m.estado) && !m.pagado)
        .reduce((acc, m) => acc + ((m.montoTotal || 0) - m.montoPagado), 0)
    }, 0)

    // Stats por colaborador — usando el mismo criterio
    const statsColaboradores = colaboradores.map((col) => {
      const modulosActivos = col.modulos.filter(m =>
        ['PENDIENTE', 'EN_CURSO'].includes(m.estado)
      ).length

      // Por cobrar: solo módulos aprobados/entregados sin pagar
      const porCobrar = col.modulos
        .filter(m => ESTADOS_COBRABLES.includes(m.estado) && !m.pagado)
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
