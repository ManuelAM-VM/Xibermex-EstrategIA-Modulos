import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const modulo = await prisma.modulo.update({
      where: { id },
      data: {
        estado: 'APROBADO',
        fechaEntrega: new Date(),
      },
      include: {
        colaborador: true,
        proyecto: true,
      },
    })
    return NextResponse.json(modulo)
  } catch (error) {
    console.error('Error approving modulo:', error)
    return NextResponse.json({ error: 'Error al aprobar módulo' }, { status: 500 })
  }
}
