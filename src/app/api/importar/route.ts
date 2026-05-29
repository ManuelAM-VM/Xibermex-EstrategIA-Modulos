import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { detectarAlertaHoras } from '@/lib/utils'

// Datos de ejemplo para importar (los 22 módulos originales)
const MODULOS_INICIALES = [
  { nombre: 'Login con roles', tipo: 'DESARROLLO', complejidad: 'MEDIA', horas: 8, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA' },
  { nombre: 'Dashboard principal', tipo: 'DESARROLLO', complejidad: 'ALTA', horas: 16, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA' },
  { nombre: 'Gestión de usuarios', tipo: 'DESARROLLO', complejidad: 'MEDIA', horas: 10, colaborador: 'Oscar M. Navarro', proyecto: 'EstrategIA' },
  { nombre: 'API REST módulos', tipo: 'DESARROLLO', complejidad: 'ALTA', horas: 20, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA' },
  { nombre: 'Diseño UI/UX base', tipo: 'DISEÑO', complejidad: 'MEDIA', horas: 12, colaborador: 'Oscar M. Navarro', proyecto: 'EstrategIA' },
  { nombre: 'Integración Supabase', tipo: 'DEVOPS', complejidad: 'MEDIA', horas: 6, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA' },
  { nombre: 'Sistema de pagos', tipo: 'DESARROLLO', complejidad: 'ALTA', horas: 18, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA' },
  { nombre: 'Reportes PDF', tipo: 'DESARROLLO', complejidad: 'MEDIA', horas: 8, colaborador: 'Oscar M. Navarro', proyecto: 'EstrategIA' },
  { nombre: 'Notificaciones email', tipo: 'DESARROLLO', complejidad: 'BAJA', horas: 4, colaborador: 'Oscar M. Navarro', proyecto: 'EstrategIA' },
  { nombre: 'Análisis IA horas', tipo: 'DESARROLLO', complejidad: 'ALTA', horas: 14, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA' },
  { nombre: 'Importar CSV', tipo: 'DESARROLLO', complejidad: 'BAJA', horas: 3, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA' },
  { nombre: 'Filtros avanzados', tipo: 'DESARROLLO', complejidad: 'MEDIA', horas: 6, colaborador: 'Oscar M. Navarro', proyecto: 'EstrategIA' },
  { nombre: 'Autenticación JWT', tipo: 'DESARROLLO', complejidad: 'MEDIA', horas: 8, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA' },
  { nombre: 'Testing unitario', tipo: 'QA', complejidad: 'MEDIA', horas: 10, colaborador: 'Oscar M. Navarro', proyecto: 'EstrategIA' },
  { nombre: 'Deploy producción', tipo: 'DEVOPS', complejidad: 'ALTA', horas: 8, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA' },
  { nombre: 'Documentación API', tipo: 'DOCUMENTACION', complejidad: 'BAJA', horas: 4, colaborador: 'Oscar M. Navarro', proyecto: 'EstrategIA' },
  { nombre: 'Optimización DB', tipo: 'DEVOPS', complejidad: 'ALTA', horas: 12, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA' },
  { nombre: 'Mobile responsive', tipo: 'DISEÑO', complejidad: 'MEDIA', horas: 8, colaborador: 'Oscar M. Navarro', proyecto: 'EstrategIA' },
  { nombre: 'Cache Redis', tipo: 'DEVOPS', complejidad: 'ALTA', horas: 10, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA' },
  { nombre: 'Logs y monitoreo', tipo: 'DEVOPS', complejidad: 'MEDIA', horas: 6, colaborador: 'Oscar M. Navarro', proyecto: 'EstrategIA' },
  { nombre: 'Reunión kickoff', tipo: 'REUNION', complejidad: 'BAJA', horas: 2, colaborador: 'Victor Manuel Arredondo', proyecto: 'EstrategIA' },
  { nombre: 'Revisión final', tipo: 'QA', complejidad: 'MEDIA', horas: 6, colaborador: 'Oscar M. Navarro', proyecto: 'EstrategIA' },
]

export async function POST() {
  try {
    // Obtener colaboradores y proyectos existentes
    const colaboradores = await prisma.colaborador.findMany()
    const proyectos = await prisma.proyecto.findMany()

    const colMap = new Map(colaboradores.map((c) => [c.nombre, c.id]))
    const proyMap = new Map(proyectos.map((p) => [p.nombre, p.id]))

    const TARIFA_HORA = 125

    const creados = []
    for (const m of MODULOS_INICIALES) {
      const colaboradorId = colMap.get(m.colaborador)
      const proyectoId = proyMap.get(m.proyecto)

      if (!colaboradorId || !proyectoId) {
        console.warn(`Saltando módulo ${m.nombre}: colaborador o proyecto no encontrado`)
        continue
      }

      const { alerta } = detectarAlertaHoras(m.horas, m.complejidad)

      const modulo = await prisma.modulo.create({
        data: {
          nombre: m.nombre,
          tipoTarea: m.tipo as never,
          complejidad: m.complejidad as never,
          horasEstimadas: m.horas,
          tarifaHora: TARIFA_HORA,
          montoTotal: m.horas * TARIFA_HORA,
          alertaHoras: alerta,
          colaboradorId,
          proyectoId,
          estado: 'APROBADO',
          fechaEntrega: new Date(),
        },
      })
      creados.push(modulo)
    }

    return NextResponse.json({
      success: true,
      importados: creados.length,
      mensaje: `Se importaron ${creados.length} módulos correctamente`,
    })
  } catch (error) {
    console.error('Error importing data:', error)
    return NextResponse.json({ error: 'Error al importar datos' }, { status: 500 })
  }
}
