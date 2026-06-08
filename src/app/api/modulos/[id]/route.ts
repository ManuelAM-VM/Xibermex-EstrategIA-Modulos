import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const modulo = await prisma.modulo.findUnique({
      where: { id },
      include: { colaborador: true, proyecto: true, pagos: true },
    })
    if (!modulo) {
      return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })
    }
    return NextResponse.json(modulo)
  } catch (error) {
    console.error('Error fetching modulo:', error)
    return NextResponse.json({ error: 'Error al obtener módulo' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Obtener el módulo actual para tener los valores base
    const actual = await prisma.modulo.findUnique({ where: { id } })
    if (!actual) {
      return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })
    }

    // Extraer _horasParaPago (campo virtual, no se guarda en DB)
    const { _horasParaPago, ...bodyLimpio } = body

    // Calcular montoTotal según el modo de pago
    const modoPago       = bodyLimpio.modoPago       ?? actual.modoPago       ?? 'POR_HORA'
    const tarifaHora     = bodyLimpio.tarifaHora     != null ? parseFloat(bodyLimpio.tarifaHora)     : actual.tarifaHora
    const horasEstimadas = bodyLimpio.horasEstimadas != null ? parseFloat(bodyLimpio.horasEstimadas) : actual.horasEstimadas
    const montoFijo      = bodyLimpio.montoFijo      != null ? parseFloat(bodyLimpio.montoFijo)      : actual.montoFijo

    // Usar horas para pago si se pasaron, si no usar estimadas
    const horasParaCalculo = _horasParaPago != null ? parseFloat(_horasParaPago) : horasEstimadas

    let montoTotal: number | null = actual.montoTotal

    if (modoPago === 'POR_HORA') {
      // Sistema de días + horas extra (cada hora extra se paga individualmente)
      const cfgExtra       = await prisma.configuracion.findUnique({ where: { clave: 'tarifa_extra' } })
      const cfgHorasDia    = await prisma.configuracion.findUnique({ where: { clave: 'horas_dia' } })
      const cfgTarifaDia   = await prisma.configuracion.findUnique({ where: { clave: 'tarifa_dia' } })

      const tarifaDiaCfg      = parseFloat(cfgTarifaDia?.valor ?? '350')
      const horasDiaCfg       = parseFloat(cfgHorasDia?.valor ?? '6')
      const tarifaExtraCfg    = parseFloat(cfgExtra?.valor ?? '550')

      const dias = Math.floor(horasParaCalculo / horasDiaCfg)
      const horasRestantes = horasParaCalculo % horasDiaCfg
      montoTotal = (dias * tarifaDiaCfg) + (horasRestantes * tarifaExtraCfg)
    } else if (modoPago === 'POR_DIA') {
      const cfgHorasDia  = await prisma.configuracion.findUnique({ where: { clave: 'horas_dia' } })
      const horasDiaCfg  = parseFloat(cfgHorasDia?.valor ?? '6')
      const diasEstimados = Math.ceil(horasParaCalculo / horasDiaCfg) || 1
      montoTotal = tarifaHora * diasEstimados
    } else if (modoPago === 'MONTO_FIJO') {
      montoTotal = montoFijo ?? actual.montoTotal
    }

    const montoPagado = actual.montoPagado
    const pagado = montoTotal != null && montoPagado >= montoTotal && montoTotal > 0

    // Si transiciona a ENTREGADO y no tiene fechaEntrega, registrarla ahora
    const fechaEntrega = bodyLimpio.estado === 'ENTREGADO' && !actual.fechaEntrega
      ? new Date()
      : bodyLimpio.fechaEntrega !== undefined
      ? bodyLimpio.fechaEntrega
      : actual.fechaEntrega

    const modulo = await prisma.modulo.update({
      where: { id },
      data: {
        ...bodyLimpio,
        modoPago,
        tarifaHora,
        montoFijo: modoPago === 'MONTO_FIJO' ? (montoFijo ?? null) : null,
        montoTotal,
        pagado,
        fechaEntrega,
      },
      include: { colaborador: true, proyecto: true, pagos: true },
    })
    return NextResponse.json(modulo)
  } catch (error) {
    console.error('Error updating modulo:', error)
    return NextResponse.json({ error: 'Error al actualizar módulo' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.modulo.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting modulo:', error)
    return NextResponse.json({ error: 'Error al eliminar módulo' }, { status: 500 })
  }
}
