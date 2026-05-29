import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const configs = await prisma.configuracion.findMany()
    const result: Record<string, string> = {}
    configs.forEach((c) => {
      result[c.clave] = c.valor
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching config:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const updates = Object.entries(body)

    const results = await Promise.all(
      updates.map(([clave, valor]) =>
        prisma.configuracion.upsert({
          where: { clave },
          update: { valor: String(valor) },
          create: { clave, valor: String(valor) },
        })
      )
    )

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error updating config:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}
