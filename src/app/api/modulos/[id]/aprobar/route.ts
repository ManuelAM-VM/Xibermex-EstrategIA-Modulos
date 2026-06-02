import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/modulos/[id]/aprobar
// Transiciona el módulo a APROBADO.
// El flujo correcto es: PENDIENTE → EN_CURSO → ENTREGADO → APROBADO
// Este endpoint maneja la aprobación final (ENTREGADO o cualquier estado → APROBADO)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const actual = await prisma.modulo.findUnique({ where: { id } })
    if (!actual) {
      return NextResponse.json({ error: 'Módulo no encontrado' }, { status: 404 })
    }

    const modulo = await prisma.modulo.update({
      where: { id },
      data: {
        estado: 'APROBADO',
        // fechaEntrega solo se asigna si aún no tiene una (fue marcado ENTREGADO antes)
        // Si viene directo de PENDIENTE, se registra la fecha de aprobación como entrega
        fechaEntrega: actual.fechaEntrega ?? new Date(),
      },
      include: { colaborador: true, proyecto: true },
    })
    return NextResponse.json(modulo)
  } catch (error) {
    console.error('Error approving modulo:', error)
    return NextResponse.json({ error: 'Error al aprobar módulo' }, { status: 500 })
  }
}
