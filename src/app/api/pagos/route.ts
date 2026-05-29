import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const colaboradorId = searchParams.get('colaboradorId')

    const where: Record<string, unknown> = {}
    if (colaboradorId) where.colaboradorId = colaboradorId

    const pagos = await prisma.pago.findMany({
      where,
      include: {
        modulo: {
          include: { proyecto: true },
        },
        colaborador: true,
      },
      orderBy: { fecha: 'desc' },
    })
    return NextResponse.json(pagos)
  } catch (error) {
    console.error('Error fetching pagos:', error)
    return NextResponse.json({ error: 'Error al obtener pagos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { moduloId, monto, notas } = body

    if (!moduloId || !monto) {
      return NextResponse.json({ error: 'moduloId y monto son requeridos' }, { status: 400 })
    }

    // Obtener el módulo para saber el colaborador
    const modulo = await prisma.modulo.findUnique({
      where: { id: moduloId },
    })

    if (!modulo) {
      return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })
    }

    // Crear el pago
    const pago = await prisma.pago.create({
      data: {
        moduloId,
        colaboradorId: modulo.colaboradorId,
        monto: parseFloat(monto),
        notas,
      },
      include: {
        modulo: { include: { proyecto: true } },
        colaborador: true,
      },
    })

    // Actualizar el monto pagado del módulo
    const nuevoPagado = modulo.montoPagado + parseFloat(monto)
    const montoTotal = modulo.montoTotal || 0
    const pagadoCompleto = nuevoPagado >= montoTotal

    await prisma.modulo.update({
      where: { id: moduloId },
      data: {
        montoPagado: nuevoPagado,
        pagado: pagadoCompleto,
      },
    })

    return NextResponse.json(pago, { status: 201 })
  } catch (error) {
    console.error('Error creating pago:', error)
    return NextResponse.json({ error: 'Error al registrar pago' }, { status: 500 })
  }
}
