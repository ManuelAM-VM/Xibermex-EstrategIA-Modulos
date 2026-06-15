import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

// POST /api/recalcular
// Recalcula montoTotal de todos los módulos desde una fecha con las tarifas actuales
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const desdeStr = body.desde ?? '2026-06-01'
    const desde = new Date(desdeStr)

    // Leer tarifas actuales de configuración
    const cfgs = await prisma.configuracion.findMany()
    const cfg = Object.fromEntries(cfgs.map(c => [c.clave, c.valor]))

    const tarifaDia   = parseFloat(cfg.tarifa_dia   ?? '350')
    const horasDia    = parseFloat(cfg.horas_dia    ?? '6')
    const tarifaExtra = parseFloat(cfg.tarifa_extra ?? '200')
    const tarifaHora  = horasDia > 0 ? tarifaDia / horasDia : 58

    // Obtener módulos a partir de esa fecha (usando fechaInicio o createdAt)
    const modulos = await prisma.modulo.findMany({
      where: {
        modoPago: { not: 'MONTO_FIJO' },
        OR: [
          { createdAt: { gte: desde } },
        ],
      },
    })

    let actualizados = 0

    await Promise.all(modulos.map(async m => {
      // Si tiene horas normales/extra definidas manualmente, usarlas
      const hn = (m as Record<string, unknown>).horasNormales as number | null
      const he = (m as Record<string, unknown>).horasExtra as number | null

      let montoTotal: number

      if (hn != null || he != null) {
        const horasNorm = hn ?? 0
        const horasExt  = he ?? 0
        const dias = Math.ceil(horasNorm / horasDia) || (horasNorm > 0 ? 1 : 0)
        montoTotal = (dias * tarifaDia) + (horasExt * tarifaExtra)
      } else {
        const dias = Math.floor(m.horasEstimadas / horasDia)
        const horasRestantes = m.horasEstimadas % horasDia
        montoTotal = (dias * tarifaDia) + (horasRestantes * tarifaExtra)
      }

      const pagado = m.montoPagado >= montoTotal && montoTotal > 0

      await prisma.modulo.update({
        where: { id: m.id },
        data: { tarifaHora, montoTotal, pagado },
      })

      actualizados++
    }))

    return NextResponse.json({
      success: true,
      actualizados,
      tarifas: { tarifaDia, horasDia, tarifaExtra },
      mensaje: `${actualizados} módulos recalculados desde ${desdeStr} con $${tarifaDia}/día + $${tarifaExtra}/hr extra`,
    })
  } catch (error) {
    console.error('Error recalculating:', error)
    return NextResponse.json({ error: 'Error al recalcular' }, { status: 500 })
  }
}
