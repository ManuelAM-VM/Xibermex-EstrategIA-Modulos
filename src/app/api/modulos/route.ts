import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { detectarAlertaHoras } from '@/lib/utils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const colaboradorId = searchParams.get('colaboradorId')
    const proyectoId    = searchParams.get('proyectoId')
    const estado        = searchParams.get('estado')
    const complejidad   = searchParams.get('complejidad')

    const where: Record<string, unknown> = {}
    if (colaboradorId) where.colaboradorId = colaboradorId
    if (proyectoId)    where.proyectoId    = proyectoId
    if (estado)        where.estado        = estado
    if (complejidad)   where.complejidad   = complejidad

    const modulos = await prisma.modulo.findMany({
      where,
      include: { colaborador: true, proyecto: true, pagos: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(modulos)
  } catch (error) {
    console.error('Error fetching modulos:', error)
    return NextResponse.json({ error: 'Error al obtener módulos' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, descripcion, tipoTarea, complejidad, horasEstimadas, colaboradorId, proyectoId, tarifaHora } = body

    if (!nombre || !colaboradorId || !proyectoId || !horasEstimadas) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, colaboradorId, proyectoId, horasEstimadas' },
        { status: 400 }
      )
    }

    // Si el cliente no envía la tarifa, leerla desde configuración
    let tarifa = tarifaHora
    if (!tarifa) {
      const cfgTarifa = await prisma.configuracion.findUnique({ where: { clave: 'tarifa_dia' } })
      const cfgHoras  = await prisma.configuracion.findUnique({ where: { clave: 'horas_dia' } })
      const tarifaDia = parseFloat(cfgTarifa?.valor || '500')
      const horasDia  = parseFloat(cfgHoras?.valor  || '4')
      tarifa = horasDia > 0 ? tarifaDia / horasDia : 125
    }

    const horas = parseFloat(horasEstimadas)
    const monto = horas * tarifa
    const { alerta } = detectarAlertaHoras(horas, complejidad || 'MEDIA')

    const modulo = await prisma.modulo.create({
      data: {
        nombre,
        descripcion: descripcion || null,
        tipoTarea:      tipoTarea   || 'DESARROLLO',
        complejidad:    complejidad || 'MEDIA',
        horasEstimadas: horas,
        tarifaHora:     tarifa,
        montoTotal:     monto,
        alertaHoras:    alerta,
        colaboradorId,
        proyectoId,
        estado: 'PENDIENTE',
      },
      include: { colaborador: true, proyecto: true },
    })
    return NextResponse.json(modulo, { status: 201 })
  } catch (error) {
    console.error('Error creating modulo:', error)
    return NextResponse.json({ error: 'Error al crear módulo' }, { status: 500 })
  }
}
