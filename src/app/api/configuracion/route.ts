import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const configs = await prisma.configuracion.findMany()
    const result: Record<string, string> = {}
    configs.forEach((c) => { result[c.clave] = c.valor })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching config:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Guardar configuración
    const updates = Object.entries(body)
    await Promise.all(
      updates.map(([clave, valor]) =>
        prisma.configuracion.upsert({
          where: { clave },
          update: { valor: String(valor) },
          create: { clave, valor: String(valor) },
        })
      )
    )

    // Si cambiaron tarifa_dia o horas_dia, recalcular todos los módulos POR_HORA y POR_DIA
    const tarifaDiaStr = body.tarifa_dia
    const horasDiaStr  = body.horas_dia

    if (tarifaDiaStr !== undefined || horasDiaStr !== undefined) {
      // Leer valores actuales de DB si no vienen en el body
      const cfgTarifa     = await prisma.configuracion.findUnique({ where: { clave: 'tarifa_dia' } })
      const cfgHoras      = await prisma.configuracion.findUnique({ where: { clave: 'horas_dia' } })
      const cfgExtra      = await prisma.configuracion.findUnique({ where: { clave: 'tarifa_extra' } })
      const cfgBloqueExtra = await prisma.configuracion.findUnique({ where: { clave: 'horas_bloque_extra' } })

      const tarifaDia       = parseFloat(tarifaDiaStr ?? cfgTarifa?.valor ?? '350')
      const horasDia        = parseFloat(horasDiaStr  ?? cfgHoras?.valor  ?? '6')
      const tarifaExtra     = parseFloat(body.tarifa_extra ?? cfgExtra?.valor ?? '550')
      const tarifaHora      = horasDia > 0 ? tarifaDia / horasDia : 0

      // Obtener todos los módulos que usan tarifa por hora o por día
      const modulos = await prisma.modulo.findMany({
        where: { modoPago: { in: ['POR_HORA', 'POR_DIA'] } },
      })

      // Recalcular montoTotal: días × tarifaDia + horasExtra × tarifaExtra
      await Promise.all(
        modulos.map((m) => {
          let montoTotal: number

          if (m.modoPago === 'POR_HORA') {
            const dias = Math.floor(m.horasEstimadas / horasDia)
            const horasRestantes = m.horasEstimadas % horasDia
            montoTotal = (dias * tarifaDia) + (horasRestantes * tarifaExtra)
          } else {
            const dias = Math.ceil(m.horasEstimadas / horasDia)
            montoTotal = dias * tarifaDia
          }

          const pagado = m.montoPagado >= montoTotal && montoTotal > 0

          return prisma.modulo.update({
            where: { id: m.id },
            data: { tarifaHora, montoTotal, pagado },
          })
        })
      )

      console.log(`Recalculados ${modulos.length} módulos con tarifa $${tarifaDia}/día (${horasDia}h) + $${tarifaExtra}/hr extra`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating config:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}
