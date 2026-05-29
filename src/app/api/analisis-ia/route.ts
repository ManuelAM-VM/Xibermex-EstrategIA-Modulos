import { NextResponse } from 'next/server'
import { COMPLEJIDAD_LABELS, HORAS_ESPERADAS, TIPO_TAREA_LABELS } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nombre, descripcion, tipoTarea, complejidad, horasEstimadas, apiKey } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key requerida' }, { status: 400 })
    }

    const rango = HORAS_ESPERADAS[complejidad]
    const prompt = `Eres un experto en estimación de proyectos de software. Analiza si las horas estimadas son razonables.

Módulo: "${nombre}"
Descripción: ${descripcion || 'Sin descripción'}
Tipo de tarea: ${TIPO_TAREA_LABELS[tipoTarea] || tipoTarea}
Complejidad: ${COMPLEJIDAD_LABELS[complejidad] || complejidad}
Horas estimadas: ${horasEstimadas}h
Rango esperado para esta complejidad: ${rango ? `${rango.min}-${rango.max}h` : 'No definido'}

Responde en máximo 2 oraciones en español. Indica si la estimación es razonable o no, y por qué.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: `Error de Anthropic: ${error.error?.message || 'Error desconocido'}` },
        { status: 500 }
      )
    }

    const data = await response.json()
    const analisis = data.content?.[0]?.text || 'Sin análisis disponible'

    return NextResponse.json({ analisis })
  } catch (error) {
    console.error('Error in AI analysis:', error)
    return NextResponse.json({ error: 'Error al procesar análisis IA' }, { status: 500 })
  }
}
