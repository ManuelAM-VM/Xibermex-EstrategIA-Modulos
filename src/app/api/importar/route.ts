import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { detectarAlertaHoras } from '@/lib/utils'

export const runtime = 'nodejs'

// Tipos válidos: DESARROLLO, ACTUALIZACION, CONFIGURACION, OPTIMIZACION
const MODULOS_INICIALES = [
  { nombre: 'Login con roles',         tipo: 'DESARROLLO',    complejidad: 'MEDIA', horas: 5,  colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Dashboard principal',     tipo: 'DESARROLLO',    complejidad: 'ALTA',  horas: 16, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Gestión de usuarios',     tipo: 'DESARROLLO',    complejidad: 'MEDIA', horas: 10, colaborador: 'Oscar M. Navarro',        proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'API REST módulos',        tipo: 'DESARROLLO',    complejidad: 'ALTA',  horas: 20, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Diseño UI/UX base',       tipo: 'ACTUALIZACION', complejidad: 'MEDIA', horas: 12, colaborador: 'Oscar M. Navarro',        proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Integración PostgreSQL',  tipo: 'CONFIGURACION', complejidad: 'MEDIA', horas: 6,  colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Sistema de pagos',        tipo: 'DESARROLLO',    complejidad: 'ALTA',  horas: 18, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA', estado: 'EN_CURSO' },
  { nombre: 'Reportes PDF',            tipo: 'DESARROLLO',    complejidad: 'MEDIA', horas: 8,  colaborador: 'Oscar M. Navarro',        proyecto: 'EstrategIA', estado: 'ENTREGADO' },
  { nombre: 'Notificaciones email',    tipo: 'DESARROLLO',    complejidad: 'BAJA',  horas: 4,  colaborador: 'Oscar M. Navarro',        proyecto: 'EstrategIA', estado: 'PENDIENTE' },
  { nombre: 'Análisis IA horas',       tipo: 'DESARROLLO',    complejidad: 'ALTA',  horas: 14, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Importar Excel',          tipo: 'DESARROLLO',    complejidad: 'BAJA',  horas: 3,  colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Filtros avanzados',       tipo: 'DESARROLLO',    complejidad: 'MEDIA', horas: 6,  colaborador: 'Oscar M. Navarro',        proyecto: 'EstrategIA', estado: 'PENDIENTE' },
  { nombre: 'Autenticación JWT',       tipo: 'DESARROLLO',    complejidad: 'MEDIA', horas: 8,  colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Optimización de queries', tipo: 'OPTIMIZACION',  complejidad: 'MEDIA', horas: 10, colaborador: 'Oscar M. Navarro',        proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Deploy producción',       tipo: 'CONFIGURACION', complejidad: 'ALTA',  horas: 8,  colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Actualización de deps',   tipo: 'ACTUALIZACION', complejidad: 'BAJA',  horas: 4,  colaborador: 'Oscar M. Navarro',        proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Caché y rendimiento',     tipo: 'OPTIMIZACION',  complejidad: 'ALTA',  horas: 12, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA', estado: 'EN_CURSO' },
  { nombre: 'UI responsive móvil',     tipo: 'ACTUALIZACION', complejidad: 'MEDIA', horas: 8,  colaborador: 'Oscar M. Navarro',        proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Configuración Docker',    tipo: 'CONFIGURACION', complejidad: 'ALTA',  horas: 10, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA', estado: 'APROBADO' },
  { nombre: 'Logs y monitoreo',        tipo: 'CONFIGURACION', complejidad: 'MEDIA', horas: 6,  colaborador: 'Oscar M. Navarro',        proyecto: 'EstrategIA', estado: 'PENDIENTE' },
  { nombre: 'Setup MarIA backend',     tipo: 'CONFIGURACION', complejidad: 'ALTA',  horas: 15, colaborador: 'Oscar M. Navarro',        proyecto: 'MarIA',      estado: 'EN_CURSO' },
  { nombre: 'Revisión final',          tipo: 'OPTIMIZACION',  complejidad: 'MEDIA', horas: 6,  colaborador: 'Oscar M. Navarro',        proyecto: 'EstrategIA', estado: 'PENDIENTE' },
]

export async function POST() {
  try {
    const colaboradores = await prisma.colaborador.findMany()
    const proyectos     = await prisma.proyecto.findMany()

    const colMap  = new Map(colaboradores.map(c => [c.nombre, c.id]))
    const proyMap = new Map(proyectos.map(p => [p.nombre, p.id]))

    // Usar tarifa configurada
    const cfgTarifa  = await prisma.configuracion.findUnique({ where: { clave: 'tarifa_dia' } })
    const cfgHoras   = await prisma.configuracion.findUnique({ where: { clave: 'horas_dia' } })
    const tarifaDia  = parseFloat(cfgTarifa?.valor || '500')
    const horasDia   = parseFloat(cfgHoras?.valor  || '4')
    const tarifaHora = tarifaDia / horasDia

    const creados: string[] = []
    const omitidos: string[] = []

    for (const m of MODULOS_INICIALES) {
      const colaboradorId = colMap.get(m.colaborador)
      const proyectoId    = proyMap.get(m.proyecto)

      if (!colaboradorId || !proyectoId) {
        omitidos.push(`${m.nombre} (colaborador/proyecto no encontrado)`)
        continue
      }

      const { alerta } = detectarAlertaHoras(m.horas, m.complejidad)
      const montoTotal  = m.horas * tarifaHora

      await prisma.modulo.create({
        data: {
          nombre:         m.nombre,
          tipoTarea:      m.tipo,
          complejidad:    m.complejidad,
          horasEstimadas: m.horas,
          tarifaHora,
          montoTotal,
          alertaHoras:    alerta,
          colaboradorId,
          proyectoId,
          estado:         m.estado,
          // fechaEntrega solo para módulos ya terminados
          fechaEntrega:   ['ENTREGADO', 'APROBADO'].includes(m.estado) ? new Date() : null,
          // NO marcar como pagado — los pagos se registran explícitamente
          pagado:      false,
          montoPagado: 0,
        },
      })
      creados.push(m.nombre)
    }

    return NextResponse.json({
      success: true,
      importados: creados.length,
      omitidos:   omitidos.length,
      mensaje:    `Se importaron ${creados.length} módulos correctamente`,
    })
  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json({ error: 'Error al importar datos' }, { status: 500 })
  }
}
