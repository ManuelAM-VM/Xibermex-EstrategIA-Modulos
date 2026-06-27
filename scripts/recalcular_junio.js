const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const desde = new Date('2026-06-01T00:00:00.000Z')
  const hasta = new Date('2026-07-01T00:00:00.000Z')

  const cfgs = await prisma.configuracion.findMany()
  const cfg = Object.fromEntries(cfgs.map(c => [c.clave, c.valor]))

  const tarifaDia = parseFloat(cfg.tarifa_dia ?? '350')
  const horasDia = parseFloat(cfg.horas_dia ?? '6')
  const tarifaExtra = parseFloat(cfg.tarifa_extra ?? '200')
  const tarifaHora = horasDia > 0 ? tarifaDia / horasDia : 58

  console.log('Tarifas usadas:', { tarifaDia, horasDia, tarifaExtra, tarifaHora })

  const modulos = await prisma.modulo.findMany({
    where: {
      modoPago: { not: 'MONTO_FIJO' },
      createdAt: { gte: desde, lt: hasta },
    },
  })

  console.log(`Encontrados ${modulos.length} módulos en junio 2026`)

  let updated = 0

  for (const m of modulos) {
    const hn = m.horasNormales
    const he = m.horasExtra

    let montoTotal = 0

    if (hn != null || he != null) {
      const horasNorm = hn ?? 0
      const horasExt = he ?? 0
      const dias = Math.ceil(horasNorm / horasDia) || (horasNorm > 0 ? 1 : 0)
      montoTotal = (dias * tarifaDia) + (horasExt * tarifaExtra)
    } else {
      const dias = Math.floor((m.horasEstimadas ?? 0) / horasDia)
      const horasRestantes = (m.horasEstimadas ?? 0) % horasDia
      if (horasRestantes > 0) {
        montoTotal = (dias + 1) * tarifaDia
      } else {
        montoTotal = dias * tarifaDia
      }
    }

    const pagado = m.montoPagado >= montoTotal && montoTotal > 0

    await prisma.modulo.update({
      where: { id: m.id },
      data: { tarifaHora, montoTotal, pagado },
    })

    updated++
  }

  console.log(`Actualizados: ${updated}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
