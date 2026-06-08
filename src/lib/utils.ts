export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function calcularTarifaHora(tarifaDia: number, horasDia: number): number {
  if (horasDia === 0) return 0
  return tarifaDia / horasDia
}

export function calcularMonto(horas: number, tarifaHora: number): number {
  return horas * tarifaHora
}

export const TIPOS_TAREA = [
  'DESARROLLO',
  'ACTUALIZACION',
  'CONFIGURACION',
  'OPTIMIZACION',
] as const

export const COMPLEJIDADES = ['BAJA', 'MEDIA', 'ALTA', 'MUY_ALTA'] as const

export const ESTADOS_MODULO = [
  'PENDIENTE',
  'EN_CURSO',
  'ENTREGADO',
  'APROBADO',
  'RECHAZADO',
] as const

export const COMPLEJIDAD_LABELS: Record<string, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  MUY_ALTA: 'Muy Alta',
}

export const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_CURSO: 'En curso',
  ENTREGADO: 'Entregado',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
}

export const TIPO_TAREA_LABELS: Record<string, string> = {
  DESARROLLO: 'Desarrollo',
  ACTUALIZACION: 'Actualización',
  CONFIGURACION: 'Configuración',
  OPTIMIZACION: 'Optimización',
}

// Horas esperadas por complejidad (rango min-max)
export const HORAS_ESPERADAS: Record<string, { min: number; max: number }> = {
  BAJA: { min: 1, max: 4 },
  MEDIA: { min: 4, max: 12 },
  ALTA: { min: 12, max: 24 },
  MUY_ALTA: { min: 24, max: 80 },
}

// ── Quincenas ────────────────────────────────────────────────────────────────

export interface Quincena {
  id: string       // "2026-06-Q1" o "2026-06-Q2"
  label: string    // "1ra quincena Jun 2026"
  inicio: Date
  fin: Date
}

// Obtener la quincena a la que pertenece una fecha
export function getQuincena(fecha: Date | string): Quincena {
  const d = new Date(fecha)
  const year = d.getFullYear()
  const month = d.getMonth() // 0-indexed
  const day = d.getDate()

  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const mesStr = meses[month]

  if (day <= 15) {
    return {
      id: `${year}-${String(month + 1).padStart(2, '0')}-Q1`,
      label: `1ra quincena ${mesStr} ${year}`,
      inicio: new Date(year, month, 1),
      fin: new Date(year, month, 15, 23, 59, 59),
    }
  } else {
    const ultimoDia = new Date(year, month + 1, 0).getDate()
    return {
      id: `${year}-${String(month + 1).padStart(2, '0')}-Q2`,
      label: `2da quincena ${mesStr} ${year}`,
      inicio: new Date(year, month, 16),
      fin: new Date(year, month, ultimoDia, 23, 59, 59),
    }
  }
}

// Obtener la quincena actual
export function getQuincenaActual(): Quincena {
  return getQuincena(new Date())
}

// Verificar si una fecha está en la quincena actual
export function esQuincenaActual(fecha: Date | string): boolean {
  const q = getQuincena(fecha)
  const actual = getQuincenaActual()
  return q.id === actual.id
}

// Obtener lista de quincenas para un rango de fechas
export function getQuincenasDesdeModulos(fechas: (Date | string)[]): Quincena[] {
  const qMap = new Map<string, Quincena>()
  fechas.forEach(f => {
    const q = getQuincena(f)
    if (!qMap.has(q.id)) qMap.set(q.id, q)
  })
  return Array.from(qMap.values()).sort((a, b) => b.inicio.getTime() - a.inicio.getTime())
}

export function detectarAlertaHoras(
  horas: number,
  complejidad: string
): { alerta: boolean; mensaje: string } {
  const rango = HORAS_ESPERADAS[complejidad]
  if (!rango) return { alerta: false, mensaje: '' }

  if (horas < rango.min) {
    return {
      alerta: true,
      mensaje: `Horas muy bajas para complejidad ${COMPLEJIDAD_LABELS[complejidad]} (esperado: ${rango.min}-${rango.max}h)`,
    }
  }
  if (horas > rango.max) {
    return {
      alerta: true,
      mensaje: `Horas muy altas para complejidad ${COMPLEJIDAD_LABELS[complejidad]} (esperado: ${rango.min}-${rango.max}h)`,
    }
  }
  return { alerta: false, mensaje: '' }
}
