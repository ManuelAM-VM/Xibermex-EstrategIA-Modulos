import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const colaboradores = await prisma.colaborador.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    })
    return NextResponse.json(colaboradores)
  } catch (error) {
    console.error('Error fetching colaboradores:', error)
    return NextResponse.json({ error: 'Error al obtener colaboradores' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, email } = body

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const colaborador = await prisma.colaborador.create({
      data: { nombre, email },
    })
    return NextResponse.json(colaborador, { status: 201 })
  } catch (error) {
    console.error('Error creating colaborador:', error)
    return NextResponse.json({ error: 'Error al crear colaborador' }, { status: 500 })
  }
}
