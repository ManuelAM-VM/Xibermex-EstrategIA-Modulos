import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { detectarAlertaHoras } from '@/lib/utils'
import * as XLSX from 'xlsx'

// Forzar Node.js runtime (xlsx necesita Buffer/fs, no funciona en edge)
export const runtime = 'nodejs'

// Mapeo de nombres de colaborador del Excel a nombres en DB
function normalizarColaborador(nombre: string): string {
  const n = nombre.trim().toUpperCase()
  if (n.includes('VICTOR') || n.includes('VÍCTOR')) return 'Victor Manuel Arredondo'
  if (n.includes('OSCAR') || n.includes('ÓSCAR')) return 'Oscar M. Navarro'
  return nombre.trim()
}

// Mapeo de tipo de tarea — normaliza variantes del Excel (sin tildes)
function normalizarTipoTarea(tipo: string): string {
  const t = tipo.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '')
  if (t.includes('ACTUALIZACION')) return 'ACTUALIZACION'
  if (t.includes('CONFIGURACION')) return 'CONFIGURACION'
  if (t.includes('OPTIMIZACION')) return 'OPTIMIZACION'
  if (t.includes('DESARROLLO')) return 'DESARROLLO'
  return 'DESARROLLO'
}

// Mapeo de complejidad
function normalizarComplejidad(comp: string): string {
  const c = comp.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (c.includes('MUY')) return 'MUY_ALTA'
  if (c.includes('ALTA')) return 'ALTA'
  if (c.includes('MEDIA')) return 'MEDIA'
  if (c.includes('BAJA')) return 'BAJA'
  return 'MEDIA'
}

// Mapeo de estatus
function normalizarEstado(estatus: string): string {
  const e = estatus.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (e.includes('LISTO') || e.includes('COMPLETADO')) return 'APROBADO'
  if (e.includes('CURSO') || e.includes('PROGRESO')) return 'EN_CURSO'
  if (e.includes('SIN') || e.includes('EMPEZAR')) return 'PENDIENTE'
  if (e.includes('ENTREGADO')) return 'ENTREGADO'
  return 'PENDIENTE'
}

// Parsear horas — maneja "4-6 hrs", "8 hrs", "10 - 11 hrs", "6", etc.
function parsearHoras(valor: string | number | undefined): number {
  if (valor === undefined || valor === null || valor === '') return 0
  const str = String(valor).trim()
  const num = parseFloat(str)
  if (!isNaN(num) && !str.includes('-')) return num
  const rangoMatch = str.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/)
  if (rangoMatch) {
    const min = parseFloat(rangoMatch[1])
    const max = parseFloat(rangoMatch[2])
    return Math.round(((min + max) / 2) * 10) / 10
  }
  const soloNum = str.match(/(\d+(?:\.\d+)?)/)
  if (soloNum) return parseFloat(soloNum[1])
  return 0
}

// Normalizar nombre de proyecto
function normalizarProyecto(nombre: string): string {
  const n = nombre.trim()
  if (n.toLowerCase().includes('maria') || n.toLowerCase().includes('maría')) return 'MarIA'
  if (n.toLowerCase().includes('estrategia') || n.toLowerCase().includes('estrategía')) return 'EstrategIA'
  return n
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls'].includes(ext || '')) {
      return NextResponse.json({ error: 'Solo se aceptan archivos .xlsx o .xls' }, { status: 400 })
    }

    // Leer el archivo
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]

    // Detectar fila de encabezados
    let headerRow = -1
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const rowStr = (rows[i] as string[]).join('|').toUpperCase()
      if (rowStr.includes('MODULO') || rowStr.includes('MÓDULO')) {
        headerRow = i
        break
      }
    }

    if (headerRow === -1) {
      return NextResponse.json(
        { error: 'No se encontró la fila de encabezados. Verifica que el Excel tenga columna MODULO.' },
        { status: 400 }
      )
    }

    // Mapear índices de columnas (normalizar headers: sin tildes, mayúsculas)
    const headers = (rows[headerRow] as string[]).map((h) =>
      String(h).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    )

    // Log para debug
    console.log('Headers detectados:', headers)

    const colIdx = {
      modulo:          headers.findIndex((h) => h.includes('MODULO')),
      proyecto:        headers.findIndex((h) => h.includes('PROYECTO')),
      colaborador:     headers.findIndex((h) => h.includes('COLABORADOR')),
      tipoTarea:       headers.findIndex((h) => h.includes('TIPO') && h.includes('TAREA')),
      tareaEspecifica: headers.findIndex((h) => h.includes('TAREA') && h.includes('ESPECIFICA')),
      complejidad:     headers.findIndex((h) => h.includes('COMPLEJIDAD')),
      horasEstimadas:  headers.findIndex((h) => h.includes('HORAS') && h.includes('ESTIMADAS')),
      // "Hrs EFECTIVAMENTE TRABAJADAS" — buscar por EFECTIVAMENTE
      horasReales:     headers.findIndex((h) => h.includes('EFECTIVAMENTE')),
      estatus:         headers.findIndex((h) => h.includes('ESTATUS') || h.includes('STATUS')),
      costo:           headers.findIndex((h) => h.includes('COSTO')),
    }

    console.log('Índices de columnas:', colIdx)

    // Obtener colaboradores y proyectos de la DB
    const [colaboradoresDB, proyectosDB] = await Promise.all([
      prisma.colaborador.findMany(),
      prisma.proyecto.findMany(),
    ])

    const colMap = new Map(colaboradoresDB.map((c) => [c.nombre, c.id]))
    const proyMap = new Map(proyectosDB.map((p) => [p.nombre, p.id]))

    // Obtener tarifa configurada
    const cfgTarifa = await prisma.configuracion.findUnique({ where: { clave: 'tarifa_dia' } })
    const cfgHoras  = await prisma.configuracion.findUnique({ where: { clave: 'horas_dia' } })
    const tarifaDia = parseFloat(cfgTarifa?.valor || '500')
    const horasDia  = parseFloat(cfgHoras?.valor  || '4')
    const tarifaHora = tarifaDia / horasDia

    const creados:  string[] = []
    const errores:  string[] = []
    const omitidos: string[] = []

    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i] as (string | number)[]

      const nombreModulo = String(row[colIdx.modulo] ?? '').trim()
      if (!nombreModulo) continue

      const proyectoRaw    = String(row[colIdx.proyecto]    ?? '').trim()
      const colaboradorRaw = String(row[colIdx.colaborador] ?? '').trim()

      if (!proyectoRaw || !colaboradorRaw) {
        omitidos.push(`Fila ${i + 1}: "${nombreModulo}" — falta proyecto o colaborador`)
        continue
      }

      const proyectoNombre   = normalizarProyecto(proyectoRaw)
      const colaboradorNombre = normalizarColaborador(colaboradorRaw)
      const colaboradorId    = colMap.get(colaboradorNombre)

      if (!colaboradorId) {
        errores.push(`Fila ${i + 1}: "${nombreModulo}" — colaborador no encontrado: "${colaboradorRaw}"`)
        continue
      }

      // Crear proyecto si no existe
      if (!proyMap.has(proyectoNombre)) {
        const nuevo = await prisma.proyecto.create({ data: { nombre: proyectoNombre } })
        proyMap.set(proyectoNombre, nuevo.id)
      }
      const proyectoId = proyMap.get(proyectoNombre)!

      const tipoTarea   = normalizarTipoTarea(String(row[colIdx.tipoTarea]  ?? 'DESARROLLO'))
      const complejidad = normalizarComplejidad(String(row[colIdx.complejidad] ?? 'MEDIA'))

      const horasEstimadas = parsearHoras(colIdx.horasEstimadas >= 0 ? row[colIdx.horasEstimadas] : undefined)
      // horasReales: solo si la columna existe Y el valor es razonable (< 200 horas)
      let horasReales: number | null = null
      if (colIdx.horasReales >= 0) {
        const val = parsearHoras(row[colIdx.horasReales])
        horasReales = val > 0 && val < 200 ? val : null
      }

      const estatusRaw  = String(row[colIdx.estatus] ?? '').trim()
      const estado      = normalizarEstado(estatusRaw)
      const descripcion = colIdx.tareaEspecifica >= 0 ? String(row[colIdx.tareaEspecifica] ?? '').trim() || null : null
      const costoRaw    = colIdx.costo >= 0 ? parseFloat(String(row[colIdx.costo] ?? '0')) || 0 : 0

      if (horasEstimadas === 0) {
        omitidos.push(`Fila ${i + 1}: "${nombreModulo}" — horas estimadas no detectadas, se usará 0`)
      }

      const { alerta } = detectarAlertaHoras(horasEstimadas, complejidad)
      const montoTotal  = horasEstimadas > 0 ? horasEstimadas * tarifaHora : costoRaw
      // Un módulo aprobado/listo NO se considera pagado automáticamente
      // el pago se registra explícitamente desde la UI
      const pagado      = false
      const montoPagado = 0

      try {
        await prisma.modulo.create({
          data: {
            nombre: nombreModulo,
            descripcion,
            tipoTarea,
            complejidad,
            horasEstimadas,
            horasReales,
            estado,
            tarifaHora,
            montoTotal,
            alertaHoras: alerta,
            pagado,
            montoPagado,
            // fechaEntrega solo para módulos que ya fueron entregados/aprobados
            fechaEntrega: ['ENTREGADO', 'APROBADO'].includes(estado) ? new Date() : null,
            colaboradorId,
            proyectoId,
          },
        })
        creados.push(nombreModulo)
      } catch (e) {
        const msg = e instanceof Error ? e.message.split('\n')[0] : 'error desconocido'
        errores.push(`Fila ${i + 1}: "${nombreModulo}" — ${msg}`)
      }
    }

    return NextResponse.json({
      success: true,
      importados: creados.length,
      omitidos: omitidos.length,
      errores: errores.length,
      detalle: { creados, omitidos, errores },
      mensaje: `${creados.length} módulos importados correctamente${errores.length > 0 ? `, ${errores.length} con errores` : ''}`,
    })
  } catch (error) {
    console.error('Error importing Excel:', error)
    return NextResponse.json(
      { error: `Error al procesar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}` },
      { status: 500 }
    )
  }
}
